import { Fragment, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  useGetBookingsSummaryQuery,
  useGetBookingsQuery,
  useCreateBookingMutation,
  useUpdateBookingStatusMutation,
} from '../features/bookings/bookingsApi'
import { useGetProjectsQuery } from '../features/projects/projectsApi'
import { useGetLeadsQuery } from '../features/leads/leadsApi'
import { useGetFormOptionsQuery } from '../features/lookups/lookupsApi'
import ConfirmDialog from '../components/ConfirmDialog'
import ProjectOptions from '../components/ProjectOptions'
import { useToast } from '../components/useToast'

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'hold', label: 'On hold' },
  { key: 'eoi', label: 'EOI' },
  { key: 'reserved', label: 'Reserved' },
  { key: 'spa', label: 'SPA signed' },
  { key: 'done', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
]

const CONFIRM_CONFIG = {
  eoi: {
    title: 'Convert hold to EOI',
    body: 'This sends your client a payment request for the AED 50,000 EOI. The unit stays secured beyond the 48-hour hold.',
    cta: 'Send payment request',
    done: "Payment request sent — we'll notify you the moment the EOI is received.",
    status: 'eoi',
  },
  release: {
    title: 'Release this unit?',
    body: "The unit returns to open inventory immediately and your client's hold ends. This can't be undone.",
    cta: 'Release unit',
    done: 'Unit released — back in open inventory.',
    status: 'cancelled',
  },
}

const EMPTY_FORM = {
  project: '',
  unit: '',
  leadId: '',
  paymentPlan: '',
  paymentMethod: '',
  jointBuyer: false,
  jointName: '',
  jointPassport: '',
  jointMobile: '',
  idFile: null,
  notes: '',
}

function Countdown({ expiresAt }) {
  const [remaining, setRemaining] = useState(Math.max(0, expiresAt - Date.now()))
  useEffect(() => {
    const id = setInterval(() => setRemaining(Math.max(0, expiresAt - Date.now())), 1000)
    return () => clearInterval(id)
  }, [expiresAt])
  const s = Math.floor(remaining / 1000)
  const h = String(Math.floor(s / 3600)).padStart(2, '0')
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const sec = String(s % 60).padStart(2, '0')
  return <span className="countdown">{h}:{m}:{sec}</span>
}

function BookingsPage() {
  const [searchParams] = useSearchParams()
  const { data: summary } = useGetBookingsSummaryQuery()
  const { data: bookings } = useGetBookingsQuery()
  const { data: projects } = useGetProjectsQuery()
  const { data: leads } = useGetLeadsQuery()
  const { data: options } = useGetFormOptionsQuery()
  const [createBooking, { isLoading: isSubmitting }] = useCreateBookingMutation()
  const [updateBookingStatus] = useUpdateBookingStatusMutation()
  const { toastNode, showToast, showError, showSuccess } = useToast()

  const projectList = projects ?? []
  const leadList = leads ?? []
  const paymentPlans = options?.paymentPlans ?? []
  const paymentMethods = options?.paymentMethods ?? []

  const [panelOpen, setPanelOpen] = useState(searchParams.get('new') === '1')
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitted, setSubmitted] = useState(null)
  const [formError, setFormError] = useState(0)

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

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    const required = ['project', 'unit', 'leadId', 'paymentPlan']
    const missing = required.some((f) => !String(form[f]).trim())
    if (missing) {
      setFormError((n) => n + 1)
      return
    }
    setFormError(0)
    try {
      const result = await createBooking(form).unwrap()
      setSubmitted(result)
      showSuccess('Reservation created successfully.')
    } catch {
      showError('Could not create this reservation — please try again.')
    }
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setSubmitted(null)
    setFormError(0)
  }

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
      await updateBookingStatus({ id: confirmBookingId, status: cfg.status }).unwrap()
    } catch {
      /* backend not ready yet */
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
          <button className="btn" type="button" onClick={() => setPanelOpen(true)}>
            + New reservation
          </button>
        </div>
      </div>

      {panelOpen && (
        <section className="panel" aria-label="Create a reservation">
          {!submitted ? (
            <>
              <h2>Create a reservation</h2>
              <p className="note">
                Reserve a unit for your client. Complete the reservation, including payment, within <b>20 minutes</b> — one
                20-minute postponement is allowed. A land registration fee of AED 3,000 applies at reservation.
              </p>
              <form onSubmit={handleSubmit} noValidate>
                <div className="fgrid">
                  <div>
                    <label>Project *</label>
                    <select value={form.project} onChange={set('project')} required>
                      <option value="">Select project</option>
                      <ProjectOptions projects={projectList} />
                    </select>
                  </div>
                  <div>
                    <label>Unit *</label>
                    <input type="text" placeholder="e.g. N-1204" value={form.unit} onChange={set('unit')} required />
                  </div>
                  <div>
                    <label>Client (registered lead) *</label>
                    <select value={form.leadId} onChange={set('leadId')} required>
                      <option value="">Select lead</option>
                      {leadList.map((lead) => (
                        <option value={lead.id} key={lead.id}>
                          {lead.clientName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Payment plan *</label>
                    <select value={form.paymentPlan} onChange={set('paymentPlan')} required>
                      <option value="">Select plan</option>
                      {paymentPlans.map((o) => (
                        <option value={o.value} key={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Payment method</label>
                    <select value={form.paymentMethod} onChange={set('paymentMethod')}>
                      <option value="">Select</option>
                      {paymentMethods.map((o) => (
                        <option value={o.value} key={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Client ID / passport</label>
                    <div className="upload">
                      <span className="file-name">{form.idFile ? form.idFile.name : 'No file selected'}</span>
                      <button
                        type="button"
                        className="btn-ghost-sm"
                        onClick={() => document.getElementById('ResIdFile').click()}
                      >
                        Upload
                      </button>
                      <input
                        type="file"
                        id="ResIdFile"
                        accept=".pdf,.jpg,.jpeg,.png"
                        style={{ display: 'none' }}
                        onChange={(e) => setForm({ ...form, idFile: e.target.files[0] ?? null })}
                      />
                    </div>
                  </div>
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
                        <div>
                          <label>Joint buyer — full name</label>
                          <input type="text" value={form.jointName} onChange={set('jointName')} />
                        </div>
                        <div>
                          <label>Passport number</label>
                          <input type="text" value={form.jointPassport} onChange={set('jointPassport')} />
                        </div>
                        <div>
                          <label>Mobile</label>
                          <input type="tel" value={form.jointMobile} onChange={set('jointMobile')} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="span-3">
                    <label>Notes</label>
                    <textarea placeholder="Plan discussed, client preferences…" value={form.notes} onChange={set('notes')} />
                  </div>
                </div>
                <div className="panel-actions">
                  <button type="submit" className="btn" disabled={isSubmitting}>
                    {isSubmitting ? 'Reserving…' : 'Reserve unit'}
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => showToast('A PDF quotation will be prepared and emailed to you shortly.')}
                  >
                    Generate quotation
                  </button>
                  <button type="button" className="btn ghost" onClick={() => setPanelOpen(false)}>
                    Cancel
                  </button>
                  {formError > 0 && (
                    <span className="form-msg show" role="alert" key={formError}>
                      Please complete the required fields — project, unit, client and payment plan.
                    </span>
                  )}
                </div>
              </form>
            </>
          ) : (
            <div className="panel-ok">
              <p className="eyebrow">Reservation placed</p>
              <h3>The unit is held for your client</h3>
              {submitted.bookingRef && (
                <p className="ref">
                  Booking reference <b>{submitted.bookingRef}</b> · Hold expires in <b>48 hours</b>
                </p>
              )}
              <p className="copy">
                Our sales team will confirm the reservation as soon as the payment is received. You can follow every milestone
                in your bookings below.
              </p>
              <div className="panel-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    resetForm()
                    setPanelOpen(false)
                  }}
                >
                  View my bookings
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {summary?.activeHold && (
        <div className="hold-alert" role="alert">
          <div>
            <p className="t">Active unit hold — {summary.activeHold.unitLabel}</p>
            <p className="s">
              Client: {summary.activeHold.clientName} · Hold placed {summary.activeHold.placedAt}
            </p>
          </div>
          <Countdown expiresAt={summary.activeHold.expiresAt} />
          <button className="act" onClick={() => openConfirm('eoi', summary.activeHold.bookingId)}>
            Convert to EOI
          </button>
          <button className="act" onClick={() => openConfirm('release', summary.activeHold.bookingId)}>
            Release unit
          </button>
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
                <th>Payments</th>
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
                      <span className="pbar">
                        <i style={{ width: `${b.paymentPct ?? 0}%` }}></i>
                      </span>
                      <span className="pbar-l">{b.paymentLabel}</span>
                    </td>
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
                      {['hold', 'eoi', 'reserved', 'spa'].includes(b.status) && (
                        <button className="row-cta" onClick={() => setOpenDetailId(openDetailId === b.id ? null : b.id)}>
                          {openDetailId === b.id ? 'Hide details' : 'View details'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {openDetailId === b.id && ['hold', 'eoi', 'reserved', 'spa'].includes(b.status) && (
                    <tr className="detail-row">
                      <td colSpan={8}>
                        <div className="timeline">
                          {(b.timeline ?? []).map((step) => (
                            <span className={`step${step.state ? ` ${step.state}` : ''}`} key={step.label}>
                              {step.label}
                            </span>
                          ))}
                        </div>
                        <p className="next-step">
                          <b>Next step:</b> {b.nextStep ?? 'No update yet.'}
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
                            <>
                              <button
                                className="row-cta"
                                onClick={() => showToast(`Payment link re-sent to ${b.clientName} — valid for 72 hours.`)}
                              >
                                Resend payment link
                              </button>
                              <button className="row-cta" onClick={() => showToast('EOI receipt download will begin shortly.')}>
                                Download EOI receipt
                              </button>
                            </>
                          )}
                          {b.status === 'reserved' && (
                            <button className="row-cta" onClick={() => showToast('Reservation form download will begin shortly.')}>
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
                  <td colSpan={8}>No bookings in this stage yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

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
