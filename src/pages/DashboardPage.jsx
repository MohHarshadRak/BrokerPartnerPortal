import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useGetDashboardSummaryQuery, useGetInventoryFeedQuery } from '../features/dashboard/dashboardApi'
import { useGetProjectsQuery } from '../features/projects/projectsApi'
import { useGetFormOptionsQuery } from '../features/lookups/lookupsApi'
import { useToast } from '../components/useToast'

const KPI_SLOTS = [
  { key: 'activeLeads', label: 'Active leads' },
  { key: 'siteVisitsBooked', label: 'Site visits booked' },
  { key: 'unitsReserved', label: 'Units reserved' },
  { key: 'commissionYtd', label: 'Commission YTD' },
]

// Highlights the standout figure at the start of a delta (a count like "+3" or
// an amount like "AED 82k"), matching the design's <strong> emphasis — deltas
// that are just plain status text (e.g. "next: 12 Jun…") are left as-is.
function renderDelta(deltaText) {
  if (!deltaText) return null
  const match = deltaText.match(/^(\+\d+|AED\s?[\d,.]+k?)(\s.*)?$/i)
  if (!match) return deltaText
  return (
    <>
      <strong>{match[1]}</strong>
      {match[2] ?? ''}
    </>
  )
}

function DashboardPage() {
  const user = useSelector((state) => state.auth.user)
  const { data: summary } = useGetDashboardSummaryQuery()
  const { data: inventory } = useGetInventoryFeedQuery()
  const { data: projects } = useGetProjectsQuery()
  const { data: options } = useGetFormOptionsQuery()
  const { toastNode, showToast } = useToast()

  const [unitMode, setUnitMode] = useState(false)
  const [project, setProject] = useState('')
  const [unitQuery, setUnitQuery] = useState('')
  const [type, setType] = useState('')
  const [bedrooms, setBedrooms] = useState('')
  const [minSize, setMinSize] = useState('')

  const rows = inventory ?? []
  const projectList = projects ?? []
  const propertyTypes = options?.propertyTypes ?? []
  const bedroomOptions = options?.bedroomOptions ?? []
  const sizeOptions = options?.sizeOptions ?? []
  const announcements = summary?.announcements ?? []
  const kpiByKey = Object.fromEntries((summary?.kpis ?? []).map((k) => [k.key, k]))

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const okTab = unitMode
        ? !unitQuery || row.unit?.toLowerCase().includes(unitQuery.toLowerCase())
        : !project || row.project === project
      const okType = !type || row.type === type
      const okBr = !bedrooms || (bedrooms === '4' ? row.bedrooms >= 4 : row.bedrooms === Number(bedrooms))
      const okSize = !minSize || row.sizeSqft >= Number(minSize)
      return okTab && okType && okBr && okSize
    })
  }, [rows, unitMode, unitQuery, project, type, bedrooms, minSize])

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const firstName = user?.fullName?.trim().split(/\s+/)[0]

  return (
    <>
      <div className="welcome">
        <div>
          <p className="eyebrow">Broker Portal</p>
          <h1>{firstName ? `Welcome back, ${firstName}` : 'Welcome back'}</h1>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="date">{today}</span>
          <Link className="btn" to="/leads?register=1">
            + Register a lead
          </Link>
        </div>
      </div>

      <section className="kpis" aria-label="Performance summary">
        {KPI_SLOTS.map((slot) => {
          const kpi = kpiByKey[slot.key]
          return (
            <div className="kpi" key={slot.key}>
              <p className="label">{slot.label}</p>
              <p className="value">{kpi?.value ?? '—'}</p>
              <p className="delta">{renderDelta(kpi?.delta)}</p>
            </div>
          )
        })}
      </section>

      <div className="cols">
        <section className="card" aria-label="Available inventory">
          <div className="card-head">
            <h2>Available inventory</h2>
            <div className="inv-tabs" role="tablist" aria-label="Inventory view">
              <button
                className={`tabbtn${!unitMode ? ' active' : ''}`}
                type="button"
                role="tab"
                aria-selected={!unitMode}
                onClick={() => setUnitMode(false)}
              >
                By project
              </button>
              <button
                className={`tabbtn${unitMode ? ' active' : ''}`}
                type="button"
                role="tab"
                aria-selected={unitMode}
                onClick={() => setUnitMode(true)}
              >
                Unit search
              </button>
            </div>
          </div>
          <div className="inv-controls">
            {!unitMode ? (
              <select aria-label="Select project" value={project} onChange={(e) => setProject(e.target.value)}>
                <option value="">All projects — both masterplans</option>
                {projectList.map((p) => (
                  <option value={p.name} key={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="search"
                placeholder="Search unit no. — e.g. N-1204"
                aria-label="Search by unit number"
                value={unitQuery}
                onChange={(e) => setUnitQuery(e.target.value)}
              />
            )}
            <select aria-label="Property type" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">Type — any</option>
              {propertyTypes.map((o) => (
                <option value={o.value} key={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select aria-label="Bedrooms" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)}>
              <option value="">Bedrooms — any</option>
              {bedroomOptions.map((o) => (
                <option value={o.value} key={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select aria-label="Minimum size" value={minSize} onChange={(e) => setMinSize(e.target.value)}>
              <option value="">Size — any</option>
              {sizeOptions.map((o) => (
                <option value={o.value} key={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Project / Unit</th>
                  <th>Property type</th>
                  <th>Bedrooms</th>
                  <th>Size (sq ft)</th>
                  <th>Price (AED)</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className="proj">{row.project} — {row.unit}</span>
                      <span className="loc">{row.location}</span>
                    </td>
                    <td>{row.type}</td>
                    <td>{row.bedrooms === 0 ? 'Studio' : `${row.bedrooms}BR`}</td>
                    <td>{row.sizeSqft}</td>
                    <td>{row.priceAed?.toLocaleString()}</td>
                    <td>
                      <span className={`status ${row.status}`}>{row.statusLabel ?? row.status}</span>
                    </td>
                    <td>
                      {row.status === 'hold' ? (
                        <a
                          className="row-cta"
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            showToast(`Added to the ${row.unit} waitlist — we'll notify you if the hold lapses.`)
                          }}
                        >
                          Join waitlist
                        </a>
                      ) : (
                        <Link className="row-cta" to="/bookings?new=1">
                          Reserve
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr className="empty-row">
                    <td colSpan={7}>No units match your filters — try widening the search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="card-foot">
            <Link to="/projects">View full inventory &rarr;</Link>
          </div>
        </section>

        <aside className="side">
          <section className="card" aria-label="Announcements">
            <div className="card-head">
              <h2>Announcements</h2>
            </div>
            <div className="announce">
              {announcements.length === 0 && <p style={{ color: 'var(--rak-navy-60)', fontSize: 13 }}>No announcements yet.</p>}
              {announcements.map((a, i) => (
                <article key={i}>
                  <time>{a.date}</time>
                  <p>{a.text}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="card whats" aria-label="Partner WhatsApp channel">
            <div className="wa-pad">
              <div className="wa-row">
                <span className="wa-ico" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4 0-.5.1-.7l.4-.5c.1-.2.1-.3 0-.5-.1-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2 0 1.3.9 2.6 1.1 2.8.1.2 1.9 2.9 4.6 4 .6.3 1.1.4 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.4-.3Z" />
                  </svg>
                </span>
                <div className="whats">
                  <p className="t">Partner WhatsApp channel</p>
                  <p className="s">Launches, price updates and broker news — straight to your phone, as they happen.</p>
                </div>
              </div>
              <button
                className="btn wa-btn"
                type="button"
                onClick={() => showToast('The channel invite will be linked here — meanwhile, ask broker relations to add you (toll free 800 4020).')}
              >
                Join the channel
              </button>
            </div>
          </section>

          <section className="support-card">
            <p className="eyebrow">We're here to help</p>
            <h3>Broker relations team</h3>
            <p>
              Toll free <b style={{ fontFamily: 'var(--font-medium)', fontWeight: 'normal' }}>800 4020</b> · +971 7 244 4432
              <br />
              Sun–Thu, 9am–6pm GST
            </p>
            <a className="btn" href="https://www.rakproperties.ae/contact" target="_blank" rel="noopener noreferrer">
              Contact us
            </a>
          </section>
        </aside>
      </div>
      {toastNode}
    </>
  )
}

export default DashboardPage
