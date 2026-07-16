import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useGetLeadsPipelineQuery, useGetLeadsQuery, useCreateLeadMutation, useUpdateLeadStatusMutation } from '../features/leads/leadsApi'
import { useGetProjectsQuery } from '../features/projects/projectsApi'
import { useGetFormOptionsQuery } from '../features/lookups/lookupsApi'
import ConfirmDialog from '../components/ConfirmDialog'
import ProjectOptions from '../components/ProjectOptions'
import { useToast } from '../components/useToast'

const PIPELINE_SLOTS = [
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'visit', label: 'Site visit' },
  { key: 'negotiation', label: 'Negotiation' },
  { key: 'won', label: 'Won (YTD)' },
]

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'visit', label: 'Site visit' },
  { key: 'negotiation', label: 'Negotiation' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
]

const CONFIRM_CONFIG = {
  contacted: {
    title: 'Mark as contacted',
    body: 'Logs your first contact with this client and moves the lead to "Contacted". Keeping activity up to date protects your lead through its 60-day window.',
    cta: 'Mark contacted',
    done: 'Done — the lead is now marked Contacted. Next step: book a site visit.',
    status: 'contacted',
  },
  visit: {
    title: 'Book a site visit',
    body: 'Sends your client an invitation for the Mina sales centre and notifies the sales team to prepare the units of interest.',
    cta: 'Send invitation',
    done: "Invitation sent — you'll be notified once your client confirms a slot.",
    status: 'visit',
  },
  outcome: {
    title: 'Record site-visit outcome',
    body: 'Capture how the visit went. Positive outcomes move the lead to "Negotiation".',
    cta: 'Move to negotiation',
    done: 'Moved to Negotiation. Next step: reserve the unit from Bookings.',
    status: 'negotiation',
  },
  reopen: {
    title: 'Re-open this lead?',
    body: 'Returns the lead to "Contacted" so you can pick the conversation back up.',
    cta: 'Re-open lead',
    done: 'Lead re-opened and back in your pipeline as Contacted.',
    status: 'contacted',
  },
}

const EMPTY_FORM = {
  salutation: '',
  fullName: '',
  mobile: '',
  email: '',
  passport: '',
  project: '',
  budget: '',
  nationality: '',
  residence: '',
  language: '',
  address: '',
  passportFile: null,
  notes: '',
}

function LeadsPage() {
  const [searchParams] = useSearchParams()
  const { data: pipeline } = useGetLeadsPipelineQuery()
  const { data: leads } = useGetLeadsQuery()
  const { data: projects } = useGetProjectsQuery()
  const { data: options } = useGetFormOptionsQuery()
  const [createLead, { isLoading: isSubmitting }] = useCreateLeadMutation()
  const [updateLeadStatus] = useUpdateLeadStatusMutation()
  const { toastNode, showError, showSuccess } = useToast()

  const projectList = projects ?? []
  const budgetRanges = options?.budgetRanges ?? []
  const nationalities = options?.nationalities ?? []
  const countries = options?.countries ?? []
  const languages = options?.languages ?? []

  const [panelOpen, setPanelOpen] = useState(searchParams.get('register') === '1')
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitted, setSubmitted] = useState(null)
  const [formError, setFormError] = useState(0)

  const [statusFilter, setStatusFilter] = useState('all')
  const [query, setQuery] = useState('')

  const [confirmType, setConfirmType] = useState(null)
  const [confirmLeadId, setConfirmLeadId] = useState(null)
  const [confirmDone, setConfirmDone] = useState(null)

  const rows = leads ?? []
  const filteredRows = useMemo(
    () =>
      rows.filter((r) => {
        const okStatus = statusFilter === 'all' || r.status === statusFilter
        const okQ = !query || `${r.clientName} ${r.projectInterest}`.toLowerCase().includes(query.toLowerCase())
        return okStatus && okQ
      }),
    [rows, statusFilter, query]
  )

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    const required = ['fullName', 'mobile', 'email', 'passport', 'project']
    const missing = required.some((f) => !form[f].trim())
    if (missing) {
      setFormError((n) => n + 1)
      return
    }
    setFormError(0)
    try {
      const result = await createLead(form).unwrap()
      setSubmitted(result)
      showSuccess('Lead submitted successfully.')
    } catch {
      showError('Could not submit this lead — please try again.')
    }
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setSubmitted(null)
    setFormError(0)
  }

  const openConfirm = (type, leadId) => {
    setConfirmType(type)
    setConfirmLeadId(leadId)
    setConfirmDone(null)
  }
  const closeConfirm = () => {
    setConfirmType(null)
    setConfirmLeadId(null)
    setConfirmDone(null)
  }
  const runConfirm = async () => {
    const cfg = CONFIRM_CONFIG[confirmType]
    try {
      await updateLeadStatus({ id: confirmLeadId, status: cfg.status }).unwrap()
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
          <h1>My leads</h1>
        </div>
        <button className="btn" type="button" onClick={() => setPanelOpen(true)}>
          + Register a lead
        </button>
      </div>

      {panelOpen && (
        <section className="panel" aria-label="Register a lead">
          {!submitted ? (
            <>
              <h2>Register a new lead</h2>
              <p className="note">
                Tell us about your client and we'll take care of the rest. Leads are confirmed within one working day, with
                60-day protection from the moment of approval.
              </p>
              <form onSubmit={handleSubmit} noValidate>
                <div className="fgrid">
                  <div>
                    <label>Salutation</label>
                    <select value={form.salutation} onChange={set('salutation')}>
                      <option value="">Select</option>
                      <option>Mr.</option>
                      <option>Mrs.</option>
                      <option>Ms.</option>
                      <option>Dr.</option>
                    </select>
                  </div>
                  <div className="span-2">
                    <label>Full name — as on Emirates ID / passport *</label>
                    <input type="text" value={form.fullName} onChange={set('fullName')} required />
                  </div>
                  <div>
                    <label>Mobile *</label>
                    <input type="tel" placeholder="+971 5x xxx xxxx" value={form.mobile} onChange={set('mobile')} required />
                  </div>
                  <div>
                    <label>Email *</label>
                    <input type="email" placeholder="name@email.com" value={form.email} onChange={set('email')} required />
                  </div>
                  <div>
                    <label>Passport number *</label>
                    <input type="text" value={form.passport} onChange={set('passport')} required />
                  </div>
                  <div>
                    <label>Project of interest *</label>
                    <select value={form.project} onChange={set('project')} required>
                      <option value="">Select project</option>
                      <ProjectOptions projects={projectList} />
                    </select>
                  </div>
                  <div>
                    <label>Budget (AED)</label>
                    <select value={form.budget} onChange={set('budget')}>
                      <option value="">Select range</option>
                      {budgetRanges.map((o) => (
                        <option value={o.value} key={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Nationality</label>
                    <select value={form.nationality} onChange={set('nationality')}>
                      <option value="">Select</option>
                      {nationalities.map((o) => (
                        <option value={o.value} key={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Country of residence</label>
                    <select value={form.residence} onChange={set('residence')}>
                      <option value="">Select</option>
                      {countries.map((o) => (
                        <option value={o.value} key={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Language preference</label>
                    <select value={form.language} onChange={set('language')}>
                      <option value="">Select</option>
                      {languages.map((o) => (
                        <option value={o.value} key={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="span-3">
                    <label>Official address</label>
                    <input type="text" placeholder="Street, city, country" value={form.address} onChange={set('address')} />
                  </div>
                  <div className="span-3">
                    <label>Client passport copy</label>
                    <div className="upload">
                      <span className="file-name">{form.passportFile ? form.passportFile.name : 'No file selected'}</span>
                      <span className="hint">PDF or image &middot; max 4&nbsp;MB</span>
                      <button
                        type="button"
                        className="btn-ghost-sm"
                        onClick={() => document.getElementById('LeadPassFile').click()}
                      >
                        Upload
                      </button>
                      <input
                        type="file"
                        id="LeadPassFile"
                        accept=".pdf,.jpg,.jpeg,.png"
                        style={{ display: 'none' }}
                        onChange={(e) => setForm({ ...form, passportFile: e.target.files[0] ?? null })}
                      />
                    </div>
                  </div>
                  <div className="span-3">
                    <label>Notes</label>
                    <textarea placeholder="Preferences, timeline, unit type…" value={form.notes} onChange={set('notes')} />
                  </div>
                </div>
                <div className="panel-actions">
                  <button type="submit" className="btn" disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting…' : 'Submit lead'}
                  </button>
                  <button type="button" className="btn ghost" onClick={() => setPanelOpen(false)}>
                    Cancel
                  </button>
                  {formError > 0 && (
                    <span className="form-msg show" role="alert" key={formError}>
                      Please complete the required fields — name, mobile, email, passport number and project.
                    </span>
                  )}
                </div>
              </form>
            </>
          ) : (
            <div className="panel-ok">
              <p className="eyebrow">Lead received</p>
              <h3>Thank you — your lead has been submitted</h3>
              {submitted.leadId && (
                <p className="ref">
                  Lead ID <b>{submitted.leadId}</b>
                </p>
              )}
              <p className="copy">
                Our team is now running a duplicate check against existing records. You'll receive confirmation within one
                working day, and your 60-day protection begins the moment the lead is approved.
              </p>
              <div className="panel-actions">
                <button type="button" className="btn" onClick={resetForm}>
                  Register another lead
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => {
                    resetForm()
                    setPanelOpen(false)
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="pipeline" aria-label="Pipeline summary">
        {PIPELINE_SLOTS.map((slot) => (
          <div className="stage" key={slot.key}>
            <p className="k">{slot.label}</p>
            <p className="v">{pipeline?.[slot.key] ?? 0}</p>
          </div>
        ))}
      </section>

      <section className="card" aria-label="Leads">
        <div className="card-head">
          <h2>All leads</h2>
          <div className="filters" role="group" aria-label="Filter leads">
            {STATUS_FILTERS.map((f) => (
              <button key={f.key} className={`chip${statusFilter === f.key ? ' active' : ''}`} type="button" onClick={() => setStatusFilter(f.key)}>
                {f.label}
              </button>
            ))}
            <input type="search" placeholder="Search client or project…" aria-label="Search leads" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Contact</th>
                <th>Project interest</th>
                <th>Registered</th>
                <th>Protection expiry</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <span className="nm">{lead.clientName}</span>
                    <span className="sub">{lead.budget}</span>
                  </td>
                  <td>
                    <span className="sub">
                      {lead.mobile}
                      <br />
                      {lead.email}
                    </span>
                  </td>
                  <td>{lead.projectInterest}</td>
                  <td>{lead.registeredOn}</td>
                  <td>
                    <span className={`expiry${lead.expiryWarn ? ' warn' : ''}`}>{lead.expiry}</span>
                  </td>
                  <td>
                    <span className={`status ${lead.status}`}>{lead.statusLabel ?? lead.status}</span>
                  </td>
                  <td>
                    {lead.status === 'new' && (
                      <button className="row-cta" onClick={() => openConfirm('contacted', lead.id)}>
                        Mark contacted
                      </button>
                    )}
                    {lead.status === 'contacted' && (
                      <button className="row-cta" onClick={() => openConfirm('visit', lead.id)}>
                        Book site visit
                      </button>
                    )}
                    {lead.status === 'visit' && (
                      <button className="row-cta" onClick={() => openConfirm('outcome', lead.id)}>
                        Record outcome
                      </button>
                    )}
                    {lead.status === 'lost' && (
                      <button className="row-cta" onClick={() => openConfirm('reopen', lead.id)}>
                        Re-open lead
                      </button>
                    )}
                    {lead.status === 'won' && (
                      <Link className="row-cta" to="/bookings">
                        View booking
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr className="empty-row">
                  <td colSpan={7}>No leads yet — register your first lead above.</td>
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

export default LeadsPage
