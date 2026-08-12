import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useGetLeadsQuery, useCreateLeadMutation } from '../features/leads/leadsApi'
// Commented out for future use, along with the pipeline summary and status filter/search
// bar below — hidden on the leads screen for now.
// import { useGetLeadsPipelineQuery } from '../features/leads/leadsApi'
// Commented out for future use, along with the "Project of interest" field below.
// import { useGetProjectsQuery } from '../features/projects/projectsApi'
// import ProjectOptions from '../components/ProjectOptions'
import { useGetNationalityListQuery } from '../features/lookups/lookupsApi'
import { useToast } from '../components/useToast'

// Commented out for future use — the pipeline summary and status filter/search bar are
// hidden on the leads screen for now.
// const PIPELINE_SLOTS = [
//   { key: 'new', label: 'New' },
//   { key: 'contacted', label: 'Contacted' },
//   { key: 'visit', label: 'Site visit' },
//   { key: 'negotiation', label: 'Negotiation' },
//   { key: 'won', label: 'Won (YTD)' },
// ]

// const STATUS_FILTERS = [
//   { key: 'all', label: 'All' },
//   { key: 'new', label: 'New' },
//   { key: 'contacted', label: 'Contacted' },
//   { key: 'visit', label: 'Site visit' },
//   { key: 'negotiation', label: 'Negotiation' },
//   { key: 'won', label: 'Won' },
//   { key: 'lost', label: 'Lost' },
// ]

const EMPTY_FORM = {
  salutation: '',
  fullName: '',
  nationality: '',
  passport: '',
  email: '',
  mobile: '',
  address: '',
  residence: '',
  passportFile: null,
  // Commented out for future use — not part of the current simplified registration form.
  // project: '',
  // budget: '',
  // language: '',
  // notes: '',
}

function LeadsPage() {
  const [searchParams] = useSearchParams()
  // const { data: pipeline } = useGetLeadsPipelineQuery() // for future use — pipeline summary
  const { data: leads } = useGetLeadsQuery()
  // const { data: projects } = useGetProjectsQuery() // for future use — "Project of interest" field
  // Real, already-live endpoint — reused for both Nationality and Country of residence,
  // same as the main registration wizard's Nationality/Office Country/Trade License Country
  // dropdowns all sharing one nationality list.
  const { data: nationalities = [] } = useGetNationalityListQuery()
  const [createLead, { isLoading: isSubmitting }] = useCreateLeadMutation()
  const { toastNode, showError, showSuccess } = useToast()

  // const projectList = projects ?? [] // for future use
  // const budgetRanges = options?.budgetRanges ?? [] // for future use
  const countries = nationalities
  // const languages = options?.languages ?? [] // for future use

  const [panelOpen, setPanelOpen] = useState(searchParams.get('register') === '1')
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitted, setSubmitted] = useState(null)
  const [formError, setFormError] = useState(0)

  // Status filter chips stay commented out below — there's no status field in the leads
  // response (clientName/nationality/passportNo/mobile/email/leadId only) to back them.
  const [query, setQuery] = useState('')

  const rows = leads ?? []
  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((lead) =>
      [lead.clientName, lead.nationality, lead.passportNo, lead.mobile, lead.email, lead.leadId].some((v) =>
        String(v ?? '').toLowerCase().includes(q)
      )
    )
  }, [rows, query])

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    const required = ['fullName', 'mobile', 'email', 'passport']
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
                    <input type="text" value={form.fullName} onChange={set('fullName')} required />
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
                    <label>Passport number *</label>
                    <input type="text" value={form.passport} onChange={set('passport')} required />
                  </div>
                  <div>
                    <label>Email *</label>
                    <input type="email" placeholder="name@email.com" value={form.email} onChange={set('email')} required />
                  </div>
                  <div>
                    <label>Phone number *</label>
                    <input type="tel" placeholder="+971 5x xxx xxxx" value={form.mobile} onChange={set('mobile')} required />
                  </div>
                  <div className="span-2">
                    <label>Official address</label>
                    <input type="text" placeholder="Street, city, country" value={form.address} onChange={set('address')} />
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
                  {/* Commented out for future use — not part of the current simplified registration form. */}
                  {/*
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
                    <label>Notes</label>
                    <textarea placeholder="Preferences, timeline, unit type…" value={form.notes} onChange={set('notes')} />
                  </div>
                  */}
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
                      Please complete the required fields — name, mobile, email and passport number.
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

      {/* Commented out for future use — pipeline summary and status filter/search bar
          hidden on the leads screen for now.
      <section className="pipeline" aria-label="Pipeline summary">
        {PIPELINE_SLOTS.map((slot) => (
          <div className="stage" key={slot.key}>
            <p className="k">{slot.label}</p>
            <p className="v">{pipeline?.[slot.key] ?? 0}</p>
          </div>
        ))}
      </section>
      */}

      <section className="card" aria-label="Leads">
        <div className="card-head">
          <h2>All leads</h2>
          <div className="filters" role="group" aria-label="Filter leads">
            <input
              type="search"
              placeholder="Search name, passport, phone, email…"
              aria-label="Search leads"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Nationality</th>
                <th>Passport No</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Lead ID</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((lead) => (
                <tr key={lead.leadId ?? lead.id}>
                  <td>
                    <span className="nm">{lead.clientName}</span>
                  </td>
                  <td>{lead.nationality}</td>
                  <td>{lead.passportNo}</td>
                  <td>{lead.mobile}</td>
                  <td>{lead.email}</td>
                  <td>{lead.leadId ?? lead.id}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr className="empty-row">
                  <td colSpan={6}>No leads yet — register your first lead above.</td>
                </tr>
              )}
              {rows.length > 0 && filteredRows.length === 0 && (
                <tr className="empty-row">
                  <td colSpan={6}>No leads match your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {toastNode}
    </>
  )
}

export default LeadsPage
