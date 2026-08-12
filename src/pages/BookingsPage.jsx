import { Fragment, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  useGetBookingsSummaryQuery,
  useGetBookingsQuery,
  useReleaseUnitHoldMutation,
  useConvertHoldToEoiMutation,
  useDownloadReservationFormMutation,
} from '../features/bookings/bookingsApi'
import ConfirmDialog from '../components/ConfirmDialog'
import ReservationWizard from '../components/ReservationWizard'
import Countdown from '../components/Countdown'
import { useToast } from '../components/useToast'

// Sending the EOI payment link moves a row from 'hold' to its own 'eoi' status; paying it
// moves to 'eoiPaid'. Neither changes the underlying 48-hour hold clock.
const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'hold', label: 'On hold' },
  { key: 'eoi', label: 'EOI' },
  { key: 'eoiPaid', label: 'EOI Paid' },
  { key: 'reserved', label: 'Reserved' },
  { key: 'spa', label: 'SPA signed' },
  { key: 'done', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
]

// "View details" timeline — a fixed 5-stage progression a booking moves through. Purely
// derived from the row's own status (no separate per-booking timeline data exists), so a row
// always shows every stage up to and including its current one as "done"/"now", the rest
// upcoming. 'eoi' and 'eoiPaid' both highlight the same "EOI" stage (sent vs paid are
// sub-states of one milestone) — paying the EOI doesn't create a real reservation (the same
// 48-hour hold still applies), so it's not the same stage as 'reserved'.
const TIMELINE_STEPS = ['Hold', 'EOI', 'Reserve', 'SPA signed', 'Handover']
const STATUS_STEP_INDEX = { hold: 0, eoi: 1, eoiPaid: 1, reserved: 2, spa: 3, done: 4 }
const bookingTimeline = (status) => {
  const currentIndex = STATUS_STEP_INDEX[status]
  if (currentIndex === undefined) return []
  return TIMELINE_STEPS.map((label, i) => ({
    label,
    state: i < currentIndex ? 'done' : i === currentIndex ? 'now' : '',
  }))
}

// "Next step" copy under the timeline — same source data as bookingTimeline (unitLabel/
// clientName/bookedOn already on the row), no new backend fields. Only hold/eoi/eoiPaid/
// reserved have a defined message; other statuses fall back to the generic "No update yet."
// below.
const firstName = (name) => name?.trim().split(/\s+/)[0] ?? ''
const NEXT_STEP_TEXT = {
  hold: (b) =>
    `Convert to EOI to collect the AED 50,000 payment before the 48-hour hold expires — otherwise ${b.unitLabel} returns to open inventory automatically.`,
  eoi: (b) =>
    `EOI payment link sent to ${firstName(b.clientName)} — they have until the 48-hour hold expires to pay, or ${b.unitLabel} returns to open inventory automatically.`,
  eoiPaid: (b) => `EOI received from ${firstName(b.clientName)} — proceed to formalize the reservation and payment plan.`,
  reserved: (b) =>
    `The SPA is being prepared by sales administration — ${firstName(b.clientName)} will be offered a signing appointment within 5 working days.`,
}
const nextStepText = (b) => NEXT_STEP_TEXT[b.status]?.(b) ?? null

const CONFIRM_CONFIG = {
  eoi: {
    title: 'Convert hold to EOI',
    body: 'This emails your client a payment link for the AED 50,000 EOI. They have until the original 48-hour hold expires to pay — it does not extend the hold.',
    cta: 'Send payment request',
    done: 'Payment request sent to your client by email.',
  },
  release: {
    title: 'Release this unit?',
    body: "The unit returns to open inventory immediately and your client's hold ends. This can't be undone.",
    cta: 'Release unit',
    done: 'Unit released — back in open inventory.',
  },
}

// SalesAgentPerformence_Select requires @SDate/@EDate, but the page has no date-range picker
// — this fixed wide range effectively returns full history without exposing any UI for it.
// (Its "Reserved" branch ignores these dates entirely regardless — the procedure's own
// behavior, not something this range controls.)
const BOOKINGS_FROM_DATE = '2000-01-01'
const bookingsToDate = () => new Date().toISOString().slice(0, 10)

function BookingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: summary } = useGetBookingsSummaryQuery({ fromDate: BOOKINGS_FROM_DATE, toDate: bookingsToDate() })
  const { data: bookings } = useGetBookingsQuery({ fromDate: BOOKINGS_FROM_DATE, toDate: bookingsToDate() })
  const [releaseUnitHold] = useReleaseUnitHoldMutation()
  const [convertHoldToEoi] = useConvertHoldToEoiMutation()
  const [downloadReservationForm] = useDownloadReservationFormMutation()
  const { toastNode, showToast, showError } = useToast()

  // "Download reservation form" for a 'reserved' row — real endpoint
  // (ReservationbyLead.Attachement). Same blob-to-download-link pattern as ProjectsPage's
  // marketing-kit download.
  const handleDownloadReservationForm = async (reserveId, unitLabel) => {
    try {
      const blob = await downloadReservationForm(reserveId).unwrap()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${unitLabel || 'reservation-form'}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      showError(err?.data?.message || 'We could not download the reservation form. Please try again.')
    }
  }

  const [panelOpen, setPanelOpen] = useState(searchParams.get('new') === '1')
  // Set when arriving from the Projects page's "Reserve" link — the unit is already known,
  // so the wizard should skip Step 1's search and land straight on Step 2.
  const initialUnitId = searchParams.get('unitId') || undefined

  // "Convert to Reserve" on an EOI-paid hold — both the unit and its client are already known,
  // so the wizard resumes straight at Step 3 (Payment Plan) instead of the URL-param path
  // above, since this action starts from a click already on this page, not a fresh navigation.
  const [reserveUnitId, setReserveUnitId] = useState(null)
  const [reserveLeadId, setReserveLeadId] = useState(null)
  const handleConvertToReserve = (unitId, leadId) => {
    setReserveUnitId(unitId)
    setReserveLeadId(leadId)
    setPanelOpen(true)
  }
  const closeWizard = () => {
    setPanelOpen(false)
    setReserveUnitId(null)
    setReserveLeadId(null)
    // Otherwise a deep-link's ?unitId=/&new=1 (Dashboard/Projects "Reserve" link) lingers in
    // the URL after Cancel — the NEXT "+ New reservation" click would still see them and jump
    // straight back to Step 2 for the same unit instead of starting genuinely fresh.
    if (searchParams.has('unitId') || searchParams.has('new')) {
      const next = new URLSearchParams(searchParams)
      next.delete('unitId')
      next.delete('new')
      setSearchParams(next, { replace: true })
    }
  }

  const [statusFilter, setStatusFilter] = useState('all')
  const [openDetailId, setOpenDetailId] = useState(null)
  const [confirmType, setConfirmType] = useState(null)
  const [confirmBookingId, setConfirmBookingId] = useState(null)
  const [confirmDone, setConfirmDone] = useState(null)

  const rows = bookings ?? []
  const filteredRows = useMemo(
    () => rows.filter((r) => statusFilter === 'all' || r.status === statusFilter),
    [rows, statusFilter]
  )

  const openConfirm = (type, bookingId) => {
    setConfirmType(type)
    setConfirmBookingId(bookingId)
    setConfirmDone(null)
  }
  const closeConfirm = () => {
    setConfirmType(null)
    setConfirmBookingId(null)
    setConfirmDone(null)
  }
  const runConfirm = async () => {
    const cfg = CONFIRM_CONFIG[confirmType]
    try {
      if (confirmType === 'release') {
        // Real endpoint (Unit_Hold_Release) — confirmBookingId is the unitId for a 'hold' row
        // (see BookingsService.MapHoldRow), which is exactly what this needs.
        await releaseUnitHold(confirmBookingId).unwrap()
      } else if (confirmType === 'eoi') {
        // Real endpoint — sends the held unit's client a payment link by email and flips the
        // row to 'eoi' status. confirmBookingId is the unitId, same as for 'release'.
        await convertHoldToEoi(confirmBookingId).unwrap()
      }
    } catch (err) {
      showError(err?.data?.message || 'Something went wrong — please try again.')
      closeConfirm()
      return
    }
    setConfirmDone(cfg.done)
  }

  return (
    <>
      <div className="head">
        <div>
          <p className="eyebrow">Broker Portal</p>
          <h1>Bookings</h1>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            className={panelOpen ? 'btn ghost' : 'btn'}
            type="button"
            onClick={() => (panelOpen ? closeWizard() : setPanelOpen(true))}
          >
            {panelOpen ? 'Cancel' : '+ New reservation'}
          </button>
        </div>
      </div>

      {panelOpen ? (
        <ReservationWizard
          onClose={closeWizard}
          initialUnitId={initialUnitId || reserveUnitId}
          initialLeadId={reserveLeadId}
        />
      ) : (
        <>
          {summary?.activeHoldsList?.length > 0 && (
            // Fixed max-height + scroll so this banner never grows the page with more holds —
            // each hold gets its own row, same layout the single-hold version used.
            <div
              className="hold-alert"
              role="alert"
              style={{ flexDirection: 'column', alignItems: 'stretch', maxHeight: 220, overflowY: 'auto', gap: 12 }}
            >
              {summary.activeHoldsList.map((hold) => (
                <div key={hold.unitId} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <div>
                    <p className="t">Active unit hold — {hold.unitLabel}</p>
                    <p className="s">
                      Hold placed {hold.placedAt} · {hold.clientName ? `Client: ${hold.clientName}` : 'No client attached yet'}
                      {hold.isEoiPaid && (
                        <>
                          {' · '}
                          <span style={{ color: '#2e5238', fontFamily: 'var(--font-medium)' }}>EOI Paid</span>
                        </>
                      )}
                      {!hold.isEoiPaid && hold.isEoiSent && (
                        <>
                          {' · '}
                          <span style={{ color: '#1d4568', fontFamily: 'var(--font-medium)' }}>EOI sent</span>
                        </>
                      )}
                    </p>
                  </div>
                  <Countdown expiresAt={hold.expiresAt} />
                  {!hold.isEoiPaid && !hold.isEoiSent && (
                    <button className="act" onClick={() => openConfirm('eoi', hold.unitId)}>
                      Convert to EOI
                    </button>
                  )}
                  {hold.isEoiPaid && hold.leadId && (
                    <button className="act" onClick={() => handleConvertToReserve(hold.unitId, hold.leadId)}>
                      Convert to Reserve
                    </button>
                  )}
                  <button className="act" onClick={() => openConfirm('release', hold.unitId)}>
                    Release unit
                  </button>
                </div>
              ))}
            </div>
          )}

          <section className="kpis" aria-label="Bookings summary">
            <div className="kpi">
              <p className="label">Active holds</p>
              <p className="value">{summary?.activeHolds ?? 0}</p>
            </div>
            <div className="kpi">
              <p className="label">Reserved</p>
              <p className="value">{summary?.reserved ?? 0}</p>
            </div>
            <div className="kpi">
              <p className="label">SPA signed</p>
              <p className="value">{summary?.spaSigned ?? 0}</p>
            </div>
            <div className="kpi">
              <p className="label">Total sales value</p>
              <p className="value">{summary?.totalSalesValue ?? 'AED 0'}</p>
            </div>
          </section>

          <section className="card" aria-label="Bookings">
            <div className="card-head">
              <h2>All bookings</h2>
              <div className="filters" role="group" aria-label="Filter bookings">
                {STATUS_FILTERS.map((f) => (
                  <button key={f.key} className={`chip${statusFilter === f.key ? ' active' : ''}`} type="button" onClick={() => setStatusFilter(f.key)}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th>Unit</th>
                    <th>Client</th>
                    <th>Booked</th>
                    <th>Sale value (AED)</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((b) => (
                    <Fragment key={b.id}>
                      <tr>
                        <td>
                          <span className="nm">{b.ref}</span>
                        </td>
                        <td>
                          <span className="nm">{b.unitLabel}</span>
                          <span className="sub">{b.unitLocation}</span>
                        </td>
                        <td>{b.clientName}</td>
                        <td>{b.bookedOn}</td>
                        <td>{b.saleValueAed?.toLocaleString()}</td>
                        <td>
                          <span className={`status ${b.status}`} title={b.statusHint}>
                            {b.statusLabel ?? b.status}
                          </span>
                        </td>
                        <td>
                          {b.status === 'hold' && (
                            <>
                              <a
                                className="row-cta"
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault()
                                  openConfirm('eoi', b.id)
                                }}
                              >
                                Convert to EOI
                              </a>
                              <br />
                            </>
                          )}
                          {b.status === 'eoiPaid' && b.leadId && (
                            <>
                              <button className="row-cta" onClick={() => handleConvertToReserve(b.id, b.leadId)}>
                                Convert to Reserve
                              </button>
                              <br />
                            </>
                          )}
                          {b.status === 'spa' && (
                            <>
                              <Link className="row-cta" to="/commissions">
                                View commission
                              </Link>
                              <br />
                            </>
                          )}
                          {b.status === 'done' && (
                            <Link className="row-cta" to="/commissions">
                              View commission
                            </Link>
                          )}
                          {['hold', 'eoi', 'eoiPaid', 'reserved', 'spa', 'done'].includes(b.status) && (
                            <button className="row-cta" onClick={() => setOpenDetailId(openDetailId === b.id ? null : b.id)}>
                              {openDetailId === b.id ? 'Hide details' : 'View details'}
                            </button>
                          )}
                        </td>
                      </tr>
                      {openDetailId === b.id && ['hold', 'eoi', 'eoiPaid', 'reserved', 'spa', 'done'].includes(b.status) && (
                        <tr className="detail-row">
                          <td colSpan={7}>
                            <div className="timeline">
                              {bookingTimeline(b.status).map((step) => (
                                <span className={`step${step.state ? ` ${step.state}` : ''}`} key={step.label}>
                                  {step.label}
                                </span>
                              ))}
                            </div>
                            <p className="next-step">
                              <b>Next step:</b> {nextStepText(b) ?? 'No update yet.'}
                            </p>
                            <div className="d-actions">
                              {b.status === 'hold' && (
                                <>
                                  <button className="row-cta" onClick={() => openConfirm('eoi', b.id)}>
                                    Convert to EOI
                                  </button>
                                  <button className="row-cta" onClick={() => openConfirm('release', b.id)}>
                                    Release unit
                                  </button>
                                </>
                              )}
                              {b.status === 'eoi' && (
                                <button className="row-cta" onClick={() => openConfirm('release', b.id)}>
                                  Release unit
                                </button>
                              )}
                              {b.status === 'eoiPaid' && (
                                <>
                                  {b.leadId && (
                                    <button className="row-cta" onClick={() => handleConvertToReserve(b.id, b.leadId)}>
                                      Convert to Reserve
                                    </button>
                                  )}
                                  {b.eoiTnxRefNo && (
                                    <Link className="row-cta" to={`/payment-confirmation?TransRefNO=${b.eoiTnxRefNo}`}>
                                      Download EOI receipt
                                    </Link>
                                  )}
                                </>
                              )}
                              {b.status === 'reserved' && (
                                <button className="row-cta" onClick={() => handleDownloadReservationForm(b.id, b.unitLabel)}>
                                  Download reservation form
                                </button>
                              )}
                              {b.status === 'spa' && (
                                <Link className="row-cta" to="/commissions">
                                  View commission line
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                  {filteredRows.length === 0 && (
                    <tr className="empty-row">
                      <td colSpan={7}>No bookings in this stage yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <ConfirmDialog
        open={!!confirmType}
        title={confirmType ? CONFIRM_CONFIG[confirmType].title : ''}
        body={confirmType ? CONFIRM_CONFIG[confirmType].body : ''}
        ctaLabel={confirmType ? CONFIRM_CONFIG[confirmType].cta : ''}
        done={confirmDone}
        onConfirm={runConfirm}
        onClose={closeConfirm}
      />
      {toastNode}
    </>
  )
}

export default BookingsPage
