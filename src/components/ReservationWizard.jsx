import { useEffect, useState } from 'react'
import { useGetProjectsQuery } from '../features/projects/projectsApi'
import { useGetLeadsQuery, useCreateLeadMutation } from '../features/leads/leadsApi'
import {
  useGetUnitFilterLookupsQuery,
  useSearchAllUnitsQuery,
  useHoldUnitMutation,
  useReleaseUnitHoldMutation,
  useSaveUnitHoldLeadMutation,
  useGetUnitDetailQuery,
  useGetPaymentPlansQuery,
  useGetPaymentPlanScheduleQuery,
  useCreateBookingMutation,
} from '../features/bookings/bookingsApi'
import { useGetNationalityListQuery } from '../features/lookups/lookupsApi'
import { useToast } from './useToast'
import Countdown from './Countdown'

const RESERVE_STEPS = ['Select Unit', 'Select Client', 'Payment Plan', 'Reserve']
// The "Hold" flow only needs a unit and a client — no payment plan, no reservation.
const HOLD_STEPS = ['Select Unit', 'Select Client']

const EMPTY_FORM = {
  // Step 1 — filters + selection
  propertyType: '',
  bedrooms: '',
  communityId: '',
  minPrice: '',
  maxPrice: '',
  unitId: '',
  // Step 2 — client
  leadId: '',
  jointBuyer: false,
  jointLeadId: '',
  // Step 3 — payment plan
  paymentPlanId: '',
  // Step 4 — reservation fee
  reservationAmount: '',
}

// Matches LeadsPage.jsx's simplified lead form field-for-field, since "+ Add new lead"
// reuses the same useCreateLeadMutation() the Leads page uses.
const EMPTY_LEAD_FORM = {
  salutation: '',
  fullName: '',
  nationality: '',
  passport: '',
  email: '',
  mobile: '',
  address: '',
  residence: '',
  passportFile: null,
}

function ReservationWizard({ onClose, initialUnitId, initialLeadId }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(EMPTY_FORM)
  const [stepError, setStepError] = useState(0)
  const [submitted, setSubmitted] = useState(null)
  const [holdExpiresAt, setHoldExpiresAt] = useState(null)
  // 'reserve' is the normal 4-step flow; 'hold' is the abbreviated Select Unit → Select Client
  // flow the grid's "Hold 48h" button starts — it never reaches Payment Plan/Reserve and never
  // calls createBooking/ReservationbyLead_FormGeneration_Save.
  const [mode, setMode] = useState('reserve')
  const [holdConfirmed, setHoldConfirmed] = useState(null)
  const STEPS = mode === 'hold' ? HOLD_STEPS : RESERVE_STEPS

  const { toastNode, showError, showSuccess } = useToast()

  // Step 1 filter dropdowns — real endpoint (BrokerPortal.GetUnitFilterLookups), scoped to
  // units that are actually for-sale and available.
  const { data: filterLookups } = useGetUnitFilterLookupsQuery()
  const communityOptions = filterLookups?.communities ?? []
  const bedroomOptions = filterLookups?.bedrooms ?? []
  const propertyTypeOptions = filterLookups?.propertyTypes ?? []

  // Real precinct list (BrokerPortal.GETPrecint) — joined client-side against each unit's
  // precintId for a project-name column, since Unit_Search doesn't return one directly.
  const { data: projects = [] } = useGetProjectsQuery()
  const projectNameByPrecintId = (id) => projects.find((p) => String(p.id) === String(id))?.projectName

  // Cross-project unit search — real endpoint (Unit_Search @Flag=2). Skipped entirely until
  // "Search" is clicked at least once, so nothing fires on mount — only on click, and again
  // whenever the applied filters actually change.
  const [appliedFilters, setAppliedFilters] = useState({
    propertyType: '',
    bedrooms: '',
    communityId: '',
    minPrice: '',
    maxPrice: '',
  })
  const [hasSearched, setHasSearched] = useState(false)
  const { data: units = [] } = useSearchAllUnitsQuery(appliedFilters, { skip: !hasSearched })
  const handleSearch = () => {
    setAppliedFilters({
      propertyType: form.propertyType,
      bedrooms: form.bedrooms,
      communityId: form.communityId,
      minPrice: form.minPrice,
      maxPrice: form.maxPrice,
    })
    setHasSearched(true)
    setUnitPage(1)
  }

  // Places a 20-minute hold on the unit as soon as it's selected (mirrors legacy's
  // BtnPostponedTime_Click) so it drops out of every other broker's search results until the
  // hold expires or the unit is actually reserved. Fire-and-forget from the broker's
  // perspective — the wizard still advances even if the hold call fails, since the reservation
  // itself is guarded server-side (ReservationbyLead_FormGeneration_Save only reserves units
  // that are still Status=1).
  const [holdUnit] = useHoldUnitMutation()
  // Tracks which unit's hold should be auto-released when the wizard closes or the broker picks
  // a different unit — only ever the transient 20-minute "Select" hold. handleHoldUnit
  // deliberately never sets this (even though it also sets form.unitId, to reuse Step 2's
  // unit-detail fetch), so a 48-hour explicit hold survives Cancel/unmount and is released only
  // from the Bookings grid.
  const [autoReleaseUnitId, setAutoReleaseUnitId] = useState(null)
  const handleSelectUnit = async (unitId) => {
    setForm((f) => ({ ...f, unitId }))
    setAutoReleaseUnitId(unitId)
    setStepError(0)
    setStep(2)
    try {
      const result = await holdUnit(unitId).unwrap()
      setHoldExpiresAt(result.expiresAt)
    } catch {
      setHoldExpiresAt(null)
    }
  }

  // Standalone "Hold" action on Step 1's grid — a real 48-hour hold, distinct from the
  // transient 20-minute lock handleSelectUnit places. Switches the wizard into 'hold' mode and
  // advances to Step 2 to pick a client — Step 3/4 (payment plan, reserve) are skipped entirely
  // for this flow (see the HOLD_STEPS-only step indicator and the panel-actions "Confirm hold"
  // button below). Deliberately never sets autoReleaseUnitId, so the cleanup effect above never
  // releases this hold on Cancel/unmount — released only from the Bookings grid, or from this
  // same row if the broker goes Back to Step 1 (heldUnitIds, plus the backend's own isHeldByMe
  // on refetch, flips it to "Release unit" here too).
  const [holdingUnitId, setHoldingUnitId] = useState(null)
  const [heldUnitIds, setHeldUnitIds] = useState(() => new Set())
  const handleHoldUnit = async (unitId) => {
    setMode('hold')
    setForm((f) => ({ ...f, unitId, leadId: '' }))
    setStepError(0)
    setHoldConfirmed(null)
    setStep(2)
    setHoldingUnitId(unitId)
    try {
      const result = await holdUnit({ unitId, durationMinutes: 2880 }).unwrap()
      setHoldExpiresAt(result.expiresAt)
      setHeldUnitIds((prev) => new Set(prev).add(unitId))
    } catch (err) {
      // The hold didn't actually happen (e.g. the unit was reserved by someone else a moment
      // ago) — don't leave the broker on Step 2 picking a client for a unit that was never
      // held; back out to Step 1 so they can search again.
      showError(err?.data?.message || 'Could not hold this unit — please try again.')
      setMode('reserve')
      setStep(1)
    } finally {
      setHoldingUnitId(null)
    }
  }

  // Two distinct pre-filled entry points, both running once on mount only:
  // 1. initialUnitId alone — arriving from the Projects page's "Reserve" link. The unit is
  //    already known, so skip Step 1 and go straight to Step 2, placing the same 20-minute
  //    hold a manual Step 1 selection would.
  // 2. initialUnitId + initialLeadId together — the Bookings grid's "Convert to Reserve" on an
  //    EOI-paid hold. Both the unit and its client are already known (the client was chosen
  //    when the hold was placed), and the unit is already held (the 48-hour EOI hold) — so this
  //    skips straight to Step 3 (Payment Plan) without placing a new hold or marking it for
  //    auto-release, since Cancel/unmount must NOT release an already-paid EOI hold.
  useEffect(() => {
    if (initialUnitId && initialLeadId) {
      setForm((f) => ({ ...f, unitId: initialUnitId, leadId: initialLeadId }))
      setStep(3)
    } else if (initialUnitId) {
      handleSelectUnit(initialUnitId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Releases the held unit when the broker cancels the wizard, goes Back to pick a different
  // unit, or navigates away without completing the reservation — rather than leaving it held
  // for the full 20 minutes with nobody actually finishing the reservation. Doesn't fire when
  // handleReserve hands off to the payment gateway (window.location.href navigation, not a
  // React unmount) — which is the right outcome, since the hold should stay active while
  // payment is in progress.
  const [releaseUnitHold] = useReleaseUnitHoldMutation()
  useEffect(() => {
    if (!autoReleaseUnitId) return undefined
    const heldUnitId = autoReleaseUnitId
    return () => {
      releaseUnitHold(heldUnitId)
    }
  }, [autoReleaseUnitId, releaseUnitHold])

  // Releases a 48-hour hold right from the same Step 1 row — for a unit already held (either
  // placed via handleHoldUnit this session, or an existing hold the backend's own isHeldByMe
  // now reports), so the broker doesn't have to leave the wizard to free it up.
  const handleReleaseHeldUnit = async (unitId) => {
    setHoldingUnitId(unitId)
    try {
      await releaseUnitHold(unitId).unwrap()
      setHeldUnitIds((prev) => {
        const next = new Set(prev)
        next.delete(unitId)
        return next
      })
      showSuccess('Unit released — back in open inventory.')
    } catch {
      showError('Could not release this unit — please try again.')
    } finally {
      setHoldingUnitId(null)
    }
  }

  // Step 2 property-details panel — real endpoint (Unit_Select @Flag=2), fetched once a
  // unit is selected. More authoritative than the search-result row (real Project/Property
  // names, friendly status, and a fixed land-registration fee — see UnitDetailSummary).
  // refetchOnMountOrArgChange forces a fresh fetch every time a unit is (re)selected instead
  // of silently serving RTK Query's cached response for that unitId — a unit's price/
  // availability can genuinely change between an earlier look and the moment it's actually
  // reserved, so cached data here is a real correctness risk, not just cosmetic staleness.
  const { data: unitDetail } = useGetUnitDetailQuery(form.unitId, {
    skip: !form.unitId,
    refetchOnMountOrArgChange: true,
  })

  // Frontend-only pagination over the search results grid.
  const UNITS_PAGE_SIZE = 10
  const [unitPage, setUnitPage] = useState(1)
  const unitPageCount = Math.max(1, Math.ceil(units.length / UNITS_PAGE_SIZE))
  const pagedUnits = units.slice((unitPage - 1) * UNITS_PAGE_SIZE, unitPage * UNITS_PAGE_SIZE)

  // Step 2 data
  const { data: leads = [] } = useGetLeadsQuery()
  const [createLead, { isLoading: isCreatingLead }] = useCreateLeadMutation()
  const { data: nationalities = [] } = useGetNationalityListQuery()
  const [showNewLead, setShowNewLead] = useState(false)
  const [leadForm, setLeadForm] = useState(EMPTY_LEAD_FORM)
  const selectedLead = leads.find((l) => String(l.leadId ?? l.id) === String(form.leadId))
  const selectedJointLead = leads.find((l) => String(l.leadId ?? l.id) === String(form.jointLeadId))

  // Step 3 data — payment plans (PaymentPlan_Select @Flag=8) and the installment schedule
  // (PaymentPlan_Select @Flag=5) are both real now. precintId comes from unitDetail (Unit_Select
  // @Flag=2), not selectedUnit — selectedUnit only exists when Step 1's own search grid ran,
  // which is skipped entirely when arriving pre-selected via initialUnitId.
  const { data: paymentPlans = [] } = useGetPaymentPlansQuery(unitDetail?.precintId, {
    skip: !unitDetail,
  })
  const selectedPlan = paymentPlans.find((p) => String(p.planId) === String(form.paymentPlanId))

  // Each plan is priced off one of the unit's four price options (PriceOptionNo 1-4 →
  // Price/Price2/Price3/Price4) — not always the base selling price shown in Property
  // Details — matching legacy propertyreservation.aspx.cs's fillPaymentPlan.
  const PRICE_BY_OPTION = {
    1: unitDetail?.sellingPriceAed,
    2: unitDetail?.price2,
    3: unitDetail?.price3,
    4: unitDetail?.price4,
  }
  const resolvedSellingPrice = PRICE_BY_OPTION[selectedPlan?.priceOptionNo] ?? unitDetail?.sellingPriceAed ?? 0

  const { data: scheduleResult } = useGetPaymentPlanScheduleQuery(
    {
      planId: form.paymentPlanId,
      sellingPrice: resolvedSellingPrice,
      propertyId: unitDetail?.propertyId,
      handoverDate: unitDetail?.handoverDate,
    },
    { skip: !form.paymentPlanId || !unitDetail }
  )
  const schedule = scheduleResult?.rows ?? []
  const totalSellingPrice = scheduleResult?.totalSellingPrice ?? 0

  const [createBooking, { isLoading: isReserving }] = useCreateBookingMutation()

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })
  const setLead = (field) => (e) => setLeadForm({ ...leadForm, [field]: e.target.value })

  const goNext = () => {
    if (step === 1 && !form.unitId) {
      setStepError((n) => n + 1)
      return
    }
    if (step === 2 && !form.leadId) {
      setStepError((n) => n + 1)
      return
    }
    if (step === 3 && !form.paymentPlanId) {
      setStepError((n) => n + 1)
      return
    }
    setStepError(0)
    setStep((s) => Math.min(s + 1, 4))
  }

  const goBack = () => {
    setStepError(0)
    setStep((s) => {
      const next = Math.max(s - 1, 1)
      if (next === 1) setMode('reserve')
      return next
    })
  }

  const handleAddLead = async (e) => {
    e.preventDefault()
    const required = ['fullName', 'mobile', 'email', 'passport']
    const missing = required.some((f) => !leadForm[f].trim())
    if (missing) {
      showError('Please complete the required client fields — name, mobile, email and passport number.')
      return
    }
    try {
      const result = await createLead(leadForm).unwrap()
      showSuccess('Lead created — selected for this reservation.')
      setForm((f) => ({ ...f, leadId: result.leadId }))
      setShowNewLead(false)
      setLeadForm(EMPTY_LEAD_FORM)
    } catch {
      showError('Could not create this lead — please try again.')
    }
  }

  // Wizard's "Hold" flow — confirms the client picked in Step 2 for the unit already held via
  // handleHoldUnit. Real endpoint (Unit_Hold_Lead_Save) — deliberately not createBooking, since
  // a hold is not a reservation and must never reach ReservationbyLead_FormGeneration_Save.
  const [saveUnitHoldLead, { isLoading: isSavingHold }] = useSaveUnitHoldLeadMutation()
  const handleConfirmHold = async () => {
    if (!form.leadId) {
      setStepError((n) => n + 1)
      return
    }
    try {
      await saveUnitHoldLead({ unitId: form.unitId, leadId: form.leadId }).unwrap()
      setHoldConfirmed(selectedLead?.clientName ?? 'this client')
    } catch {
      showError('Could not confirm this hold — please try again.')
    }
  }

  const handleReserve = async () => {
    const enteredAmount = Number(form.reservationAmount) || 0
    if (enteredAmount <= 0) {
      showError('Please enter an amount to pay greater than 0.')
      return
    }

    try {
      const result = await createBooking({
        ...form,
        sellingPrice: totalSellingPrice,
        payeeEmail: selectedLead?.email,
        payeeMobile: selectedLead?.mobile,
      }).unwrap()

      if (result.paymentGatewayUrl) {
        // Full-page handoff to the legacy app's payment gateway page — it owns the actual
        // MIGS/VPC integration, which isn't reimplemented here (see BookingsService).
        window.location.href = result.paymentGatewayUrl
        return
      }

      setSubmitted(result)
      if (!result.paymentInitiationFailed) {
        showSuccess('Reservation created successfully.')
      }
    } catch {
      showError('Could not create this reservation — please try again.')
    }
  }

  // Shown at the top of Steps 2, 3 and 4 so the selected property stays visible through the
  // rest of the wizard, not just right after picking it. The hold banner rides along with it,
  // so the broker can see their remaining hold time on every step until it either expires or
  // the reservation is completed.
  const propertyDetailsCard = unitDetail && (
    <>
      {holdExpiresAt && mode === 'reserve' && (
        <div className="hold-alert">
          <div>
            <p className="t">Unit held for you</p>
            <p className="s">No other broker can select this unit while your hold is active.</p>
          </div>
          <Countdown expiresAt={holdExpiresAt} />
        </div>
      )}
      <div className="card" style={{ marginBottom: 18, borderLeft: '4px solid var(--rak-navy)' }}>
        <div className="card-head" style={{ padding: '6px 14px' }}>
          <h3 style={{ fontSize: 10 }}>Property Details</h3>
        </div>
        <div className="facts" style={{ gridTemplateColumns: 'repeat(3, 1fr)', borderTop: '1px solid var(--rak-navy-10)' }}>
          {[
            ['Project Name', unitDetail.projectName],
            ['Property Name', unitDetail.propertyName],
            ['Property Status', unitDetail.propertyStatus],
            ['Type', unitDetail.type],
            ['Total Area (SQFT)', unitDetail.totalAreaSqft?.toLocaleString(undefined, { maximumFractionDigits: 0 })],
            ['Rooms', unitDetail.rooms],
            ['Selling Price (Incl. VAT)-AED', unitDetail.sellingPriceAed?.toLocaleString()],
            ['Land Registration Fee (AED)', unitDetail.landRegFeeAed?.toLocaleString()],
            ['Unit No', unitDetail.unitNo],
          ].map(([k, v]) => (
            <div className="fact" style={{ padding: '10px 14px' }} key={k}>
              <p style={{ fontSize: 13 }}>
                <span style={{ fontFamily: 'var(--font-medium)' }}>{k}:</span> {v}
              </p>
            </div>
          ))}
        </div>
      </div>
    </>
  )

  if (holdConfirmed) {
    // Deliberately its own lightweight panel, not the "Reservation placed" one below — a hold
    // never goes through createBooking/ReservationbyLead_FormGeneration_Save.
    return (
      <section className="panel" aria-label="Create a reservation">
        <div className="panel-ok">
          <p className="eyebrow">Hold confirmed</p>
          <h3>This unit is held for {holdConfirmed}</h3>
          <p className="copy">
            No payment is required yet. The hold lasts 48 hours and can be released any time from your Bookings
            grid.
          </p>
          <div className="panel-actions">
            <button type="button" className="btn" onClick={onClose}>
              View my bookings
            </button>
          </div>
        </div>
        {toastNode}
      </section>
    )
  }

  if (submitted && submitted.paymentInitiationFailed) {
    // Payment never started, so this is not treated as an active/held booking — no booking
    // reference, no hold-expiry framing, just the same error message legacy's
    // PaymentConfirmation.aspx.cs shows on its own catch-all failure.
    return (
      <section className="panel" aria-label="Create a reservation">
        <div className="panel-error" role="alert">
          <span className="panel-error-icon" aria-hidden="true">
            ✕
          </span>
          <p>Error while processing your request!..Please contact our Customer Service department</p>
        </div>
        <div className="panel-actions">
          <button type="button" className="btn" onClick={onClose}>
            View my bookings
          </button>
        </div>
        {toastNode}
      </section>
    )
  }

  if (submitted) {
    return (
      <section className="panel" aria-label="Create a reservation">
        <div className="panel-ok">
          <p className="eyebrow">Reservation placed</p>
          <h3>The unit is held for your client</h3>
          {submitted.reservationId && (
            <p className="ref">
              Booking reference <b>{submitted.reservationId}</b> · Hold expires in <b>48 hours</b>
            </p>
          )}
          <p className="copy">
            Our sales team will confirm the reservation as soon as the payment is received. You can follow every
            milestone in your bookings below.
          </p>
          <div className="panel-actions">
            <button type="button" className="btn" onClick={onClose}>
              View my bookings
            </button>
          </div>
        </div>
        {toastNode}
      </section>
    )
  }

  return (
    <section className="panel wizard" aria-label="Create a reservation">
      <h2>{mode === 'hold' ? 'Hold a unit for your client' : 'Create a reservation'}</h2>
      <p className="note">
        {mode === 'hold' ? (
          <>
            No payment is required — the unit stays held for <b>48 hours</b> once you confirm a client, and can be
            released any time from your Bookings grid.
          </>
        ) : (
          <>
            Reserve a unit for your client. Complete the reservation, including payment, within <b>20 minutes</b> —
            one 20-minute postponement is allowed. A land registration fee applies at reservation.
          </>
        )}
      </p>

      <div className="wizard-steps">
        {STEPS.map((label, i) => {
          const num = i + 1
          const state = num < step ? 'done' : num === step ? 'now' : ''
          return (
            <div className={`wizard-step${state ? ` ${state}` : ''}`} key={label}>
              <span className="circle">{num < step ? '✓' : num}</span>
              <span className="label">{label}</span>
              {num < STEPS.length && <span className="line" />}
            </div>
          )
        })}
      </div>

      {step === 1 && (
        <>
          <div className="fgrid">
            <div>
              <label>Property Type</label>
              <select value={form.propertyType} onChange={set('propertyType')}>
                <option value="">Any</option>
                {propertyTypeOptions.map((o) => (
                  <option value={o.value} key={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Bedrooms</label>
              <select value={form.bedrooms} onChange={set('bedrooms')}>
                <option value="">Any</option>
                {bedroomOptions.map((o) => (
                  <option value={o.value} key={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Community</label>
              <select value={form.communityId} onChange={set('communityId')}>
                <option value="">Any</option>
                {communityOptions.map((o) => (
                  <option value={o.value} key={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Min Price (AED)</label>
              <input type="number" min="0" placeholder="0" value={form.minPrice} onChange={set('minPrice')} />
            </div>
            <div>
              <label>Max Price (AED)</label>
              <input type="number" min="0" placeholder="0" value={form.maxPrice} onChange={set('maxPrice')} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="button" className="btn" onClick={handleSearch}>
                Search
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto', marginTop: 18 }}>
            <table aria-label="Matching units">
              <thead>
                <tr>
                  <th>Unit No</th>
                  <th>Project Name</th>
                  <th>Model</th>
                  <th>Rooms</th>
                  <th>Build Area (Sq.Ft)</th>
                  <th>Indoor Area (Sq.Ft)</th>
                  <th>Selling Price (AED)</th>
                  <th>Reserve / Hold</th>
                </tr>
              </thead>
              <tbody>
                {pagedUnits.map((u) => (
                  <tr key={u.unitId} className={String(u.unitId) === String(form.unitId) ? 'active' : ''}>
                    <td>
                      <span className="u">{u.unitNo}</span>
                    </td>
                    <td>{projectNameByPrecintId(u.precintId)}</td>
                    <td>{u.model}</td>
                    <td>{u.bedrooms}</td>
                    <td>{u.buildAreaSqft?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td>{u.indoorAreaSqft?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td>{u.sellingPriceAed?.toLocaleString()}</td>
                    <td>
                      <button type="button" className="row-cta" onClick={() => handleSelectUnit(u.unitId)}>
                        {String(u.unitId) === String(form.unitId) ? 'Selected' : 'Reserve'}
                      </button>
                      <br />
                      {/* Already actively held (by this broker, from a fresh backend check or
                          this session's own Hold click) — offer Release instead of Hold again,
                          since holding it again is a no-op. */}
                      {u.isHeldByMe || heldUnitIds.has(u.unitId) ? (
                        <button
                          type="button"
                          className="row-cta"
                          onClick={() => handleReleaseHeldUnit(u.unitId)}
                          disabled={holdingUnitId === u.unitId}
                        >
                          {holdingUnitId === u.unitId ? 'Releasing…' : 'Release unit'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="row-cta"
                          onClick={() => handleHoldUnit(u.unitId)}
                          disabled={holdingUnitId === u.unitId}
                        >
                          {holdingUnitId === u.unitId ? 'Holding…' : 'Hold 48h'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {units.length === 0 && (
                  <tr className="empty-row">
                    <td colSpan={8}>
                      {hasSearched
                        ? 'No units match your filters — try widening the search.'
                        : 'Set your filters (or leave them as Any) and click Search to see matching units.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {units.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
              <button
                type="button"
                className="btn-ghost-sm"
                disabled={unitPage === 1}
                onClick={() => setUnitPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span style={{ fontSize: 12, color: 'var(--rak-navy-60)' }}>
                Page {unitPage} of {unitPageCount} · {units.length} units
              </span>
              <button
                type="button"
                className="btn-ghost-sm"
                disabled={unitPage === unitPageCount}
                onClick={() => setUnitPage((p) => Math.min(unitPageCount, p + 1))}
              >
                Next
              </button>
            </div>
          )}

        </>
      )}

      {step === 2 && (
        <>
          {propertyDetailsCard}

          <div className="card" style={{ marginBottom: 18, borderLeft: '4px solid var(--rak-terracotta)' }}>
            <div className="card-head" style={{ padding: '6px 14px' }}>
              <h3 style={{ fontSize: 10 }}>Client Details</h3>
            </div>
            <div className="pad">
          <div className="fgrid">
            <div className="span-2">
              <label>Client (registered lead) *</label>
              <select value={form.leadId} onChange={set('leadId')} required>
                <option value="">Select lead</option>
                {leads.map((lead) => (
                  <option value={lead.leadId ?? lead.id} key={lead.leadId ?? lead.id}>
                    {lead.clientName}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="button" className="btn-ghost-sm" onClick={() => setShowNewLead((v) => !v)}>
                {showNewLead ? 'Cancel' : '+ Add new lead'}
              </button>
            </div>
          </div>

          {showNewLead && (
            <div className="card" style={{ marginTop: 18 }}>
              <div className="card-head">
                <h3>New lead</h3>
              </div>
              <div className="pad">
                <div className="fgrid">
                  <div>
                    <label>Salutation</label>
                    <select value={leadForm.salutation} onChange={setLead('salutation')}>
                      <option value="0">-</option>
                      <option value="M/S.">M/S.</option>
                      <option value="Miss.">Miss.</option>
                      <option value="Mr & Mrs.">Mr & Mrs.</option>
                      <option value="Mr.">Mr.</option>
                      <option value="Mrs.">Mrs.</option>
                      <option value="Ms.">Ms.</option>
                      <option value="Sheikh">Sheikh</option>
                      <option value="Sheikha">Sheikha</option>
                    </select>
                  </div>
                  <div className="span-2">
                    <label>Full name provided on the Emirates ID *</label>
                    <input type="text" value={leadForm.fullName} onChange={setLead('fullName')} required />
                  </div>
                  <div>
                    <label>Nationality</label>
                    <select value={leadForm.nationality} onChange={setLead('nationality')}>
                      <option value="">Select</option>
                      {nationalities.map((o) => (
                        <option value={o.value} key={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Passport number *</label>
                    <input type="text" value={leadForm.passport} onChange={setLead('passport')} required />
                  </div>
                  <div>
                    <label>Email *</label>
                    <input type="email" placeholder="name@email.com" value={leadForm.email} onChange={setLead('email')} required />
                  </div>
                  <div>
                    <label>Phone number *</label>
                    <input type="tel" placeholder="+971 5x xxx xxxx" value={leadForm.mobile} onChange={setLead('mobile')} required />
                  </div>
                  <div className="span-2">
                    <label>Official address</label>
                    <input type="text" placeholder="Street, city, country" value={leadForm.address} onChange={setLead('address')} />
                  </div>
                  <div>
                    <label>Country of residence</label>
                    <select value={leadForm.residence} onChange={setLead('residence')}>
                      <option value="">Select</option>
                      {nationalities.map((o) => (
                        <option value={o.value} key={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="span-3">
                    <label>Client passport copy *</label>
                    <div className="upload">
                      <span className="file-name">{leadForm.passportFile ? leadForm.passportFile.name : 'No file selected'}</span>
                      <span className="hint">PDF or image &middot; max 4&nbsp;MB</span>
                      <button type="button" className="btn-ghost-sm" onClick={() => document.getElementById('NewLeadPassFile').click()}>
                        Upload
                      </button>
                      <input
                        type="file"
                        id="NewLeadPassFile"
                        accept=".pdf,.jpg,.jpeg,.png"
                        style={{ display: 'none' }}
                        onChange={(e) => setLeadForm({ ...leadForm, passportFile: e.target.files[0] ?? null })}
                      />
                    </div>
                  </div>
                </div>
                <div className="panel-actions">
                  <button type="button" className="btn" onClick={handleAddLead} disabled={isCreatingLead}>
                    {isCreatingLead ? 'Saving…' : 'Save lead'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedLead && (
            <div
              className="facts"
              style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 18, border: '1px solid var(--rak-navy-10)' }}
            >
              {[
                ['Client Name', selectedLead.clientName],
                ['Nationality', selectedLead.nationality],
                ['Passport No', selectedLead.passportNo],
                ['Phone', selectedLead.mobile],
                ['Email', selectedLead.email],
              ].map(([k, v]) => (
                <div className="fact" style={{ padding: '10px 14px' }} key={k}>
                  <p style={{ fontSize: 13 }}>
                    <span style={{ fontFamily: 'var(--font-medium)' }}>{k}:</span> {v}
                  </p>
                </div>
              ))}
            </div>
          )}

            </div>
          </div>

          {mode === 'reserve' && (
            <div className="card" style={{ borderLeft: '4px solid var(--rak-sage)' }}>
              <div className="card-head" style={{ padding: '6px 14px' }}>
                <h3 style={{ fontSize: 10 }}>Joint Buyer Details</h3>
              </div>
              <div className="pad">
            <div className="fgrid">
              <div className="span-3" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="joint-toggle"
                  style={{ width: 15, height: 15 }}
                  checked={form.jointBuyer}
                  onChange={(e) => setForm({ ...form, jointBuyer: e.target.checked })}
                />
                <label htmlFor="joint-toggle" style={{ margin: 0, cursor: 'pointer' }}>
                  Add a joint buyer (optional)
                </label>
              </div>
              {form.jointBuyer && (
                <div className="span-3">
                  <div className="fgrid">
                    <div className="span-3">
                      <label>Joint buyer (registered lead) *</label>
                      <select value={form.jointLeadId} onChange={set('jointLeadId')}>
                        <option value="">Select lead</option>
                        {leads
                          .filter((lead) => String(lead.leadId ?? lead.id) !== String(form.leadId))
                          .map((lead) => (
                            <option value={lead.leadId ?? lead.id} key={lead.leadId ?? lead.id}>
                              {lead.clientName}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {selectedJointLead && (
                    <div className="facts" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 18, border: '1px solid var(--rak-navy-10)' }}>
                      {[
                        ['Client Name', selectedJointLead.clientName],
                        ['Nationality', selectedJointLead.nationality],
                        ['Passport No', selectedJointLead.passportNo],
                        ['Phone', selectedJointLead.mobile],
                        ['Email', selectedJointLead.email],
                      ].map(([k, v]) => (
                        <div className="fact" style={{ padding: '10px 14px' }} key={k}>
                          <p style={{ fontSize: 13 }}>
                            <span style={{ fontFamily: 'var(--font-medium)' }}>{k}:</span> {v}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
              </div>
            </div>
          )}
        </>
      )}

      {step === 3 && (
        <>
          {propertyDetailsCard}

          <div className="fgrid">
            <div className="span-2">
              <label>Payment plan *</label>
              <select value={form.paymentPlanId} onChange={set('paymentPlanId')} required>
                <option value="">Select plan</option>
                {paymentPlans.map((p) => (
                  <option value={p.planId} key={p.planId}>
                    {p.planName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto', marginTop: 18 }}>
            <table>
              <thead>
                <tr>
                  <th>SlNo</th>
                  <th>Installment</th>
                  <th>Date</th>
                  <th>Amount (%)</th>
                  <th>Amount (AED)</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((row) => (
                  <tr key={row.slNo}>
                    <td>{row.slNo}</td>
                    <td>{row.installmentName}</td>
                    <td>{row.date ? new Date(row.date).toLocaleDateString() : '—'}</td>
                    <td>{row.amtPercent}</td>
                    <td>{row.amount?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
                {schedule.length === 0 && (
                  <tr className="empty-row">
                    <td colSpan={5}>Select a plan to see its payment schedule.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {schedule.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <p style={{ fontSize: 13 }}>
                <span style={{ fontFamily: 'var(--font-medium)' }}>Total Selling Price:</span>{' '}
                AED {totalSellingPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
          )}
        </>
      )}

      {step === 4 && (
        <>
          {propertyDetailsCard}

          <div className="card" style={{ borderLeft: '4px solid var(--rak-terracotta)' }}>
            <div className="card-head" style={{ padding: '6px 14px' }}>
              <h3 style={{ fontSize: 10 }}>Payment Details</h3>
            </div>
            <div className="facts" style={{ gridTemplateColumns: 'repeat(2, 1fr)', borderTop: '1px solid var(--rak-navy-10)' }}>
              {[
                ['Payment Plan', selectedPlan?.planName ?? '—'],
                [
                  'Price (Incl. VAT)',
                  `AED ${totalSellingPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
                ],
              ].map(([k, v]) => (
                <div className="fact" style={{ padding: '10px 14px' }} key={k}>
                  <p style={{ fontSize: 13 }}>
                    <span style={{ fontFamily: 'var(--font-medium)' }}>{k}:</span> {v}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginTop: 18, borderLeft: '4px solid var(--rak-navy)' }}>
            <div className="card-head" style={{ padding: '6px 14px' }}>
              <h3 style={{ fontSize: 10 }}>Amount to Pay</h3>
            </div>
            <div className="pad">
              <div className="fgrid">
                <div>
                  <label>Amount to pay (AED) *</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form.reservationAmount}
                    onChange={set('reservationAmount')}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="panel-actions">
        {step > 1 && (
          <button type="button" className="btn ghost" onClick={goBack}>
            Back
          </button>
        )}
        {mode === 'hold' && step === 2 && (
          <button type="button" className="btn" onClick={handleConfirmHold} disabled={isSavingHold}>
            {isSavingHold ? 'Confirming…' : 'Confirm hold'}
          </button>
        )}
        {mode === 'reserve' && step > 1 && step < 4 && (
          <button type="button" className="btn" onClick={goNext}>
            Next
          </button>
        )}
        {mode === 'reserve' && step === 4 && (
          <button type="button" className="btn" onClick={handleReserve} disabled={isReserving}>
            {isReserving ? 'Reserving…' : 'Reserve unit'}
          </button>
        )}
        {stepError > 0 && (
          <span className="form-msg show" role="alert" key={stepError}>
            Please complete the required fields for this step.
          </span>
        )}
      </div>
      {toastNode}
    </section>
  )
}

export default ReservationWizard
