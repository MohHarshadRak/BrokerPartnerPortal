import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useGetAnnouncementsQuery } from '../features/dashboard/dashboardApi'
import { useGetProjectsQuery } from '../features/projects/projectsApi'
import { useGetUnitFilterLookupsQuery, useSearchAllUnitsQuery, useGetBookingsSummaryQuery } from '../features/bookings/bookingsApi'
import { useGetLeadsQuery } from '../features/leads/leadsApi'
import { useGetCommissionsSummaryQuery } from '../features/commissions/commissionsApi'
import { useToast } from '../components/useToast'

// Matches BookingsPage's own range — SalesAgentPerformence_Select's "Reserved" branch ignores
// these dates entirely regardless, so this just needs to cover everything.
const BOOKINGS_FROM_DATE = '2000-01-01'
const bookingsToDate = () => new Date().toISOString().slice(0, 10)

// Same static bands as ProjectsPage's Available-units size filter — Unit_Search has no size
// parameter, so this is applied client-side against the already-fetched results below.
const SIZE_OPTIONS = [
  { value: '', label: 'Size — any' },
  { value: '500', label: '500+' },
  { value: '750', label: '750+' },
  { value: '1000', label: '1,000+' },
  { value: '1500', label: '1,500+' },
  { value: '2000', label: '2,000+' },
]

function DashboardPage() {
  const user = useSelector((state) => state.auth.user)
  const { data: announcementsData } = useGetAnnouncementsQuery()
  const { data: projects } = useGetProjectsQuery()
  // Performance summary KPIs — real endpoints already powering Leads/Bookings/Commissions,
  // reused here rather than the dead /dashboard/summary placeholder. activeHolds/reserved come
  // from SalesAgentPerformence_Select @Flag=1 (same as BookingsPage's own summary cards).
  const { data: leads } = useGetLeadsQuery()
  const { data: bookingsSummary } = useGetBookingsSummaryQuery({ fromDate: BOOKINGS_FROM_DATE, toDate: bookingsToDate() })
  const { data: commissionsSummary } = useGetCommissionsSummaryQuery()
  // Same real endpoints already powering the reservation wizard's Step 1 cross-project
  // search (Unit_Search @Flag=3) — for-sale units only, excluding anything on hold by a
  // different broker.
  const { data: filterLookups } = useGetUnitFilterLookupsQuery()
  const { toastNode, showToast } = useToast()

  const [unitMode, setUnitMode] = useState(false)
  const [project, setProject] = useState('')
  const [unitQuery, setUnitQuery] = useState('')
  const [type, setType] = useState('')
  const [bedrooms, setBedrooms] = useState('')
  const [minSize, setMinSize] = useState('')

  const projectList = projects ?? []
  const propertyTypes = filterLookups?.propertyTypes ?? []
  const bedroomOptions = filterLookups?.bedrooms ?? []
  const announcements = announcementsData ?? []

  // Filtering happens server-side — communityId is the selected project's precinct id (only
  // meaningful in "By project" mode); search is the unit-number query (only meaningful in
  // "Unit search" mode). No client-side re-filtering needed, so the query just re-fires
  // whenever these change.
  const { data: units } = useSearchAllUnitsQuery({
    communityId: unitMode ? '' : project,
    propertyType: type,
    bedrooms,
    search: unitMode ? unitQuery : '',
  })

  const projectByPrecintId = (id) => projectList.find((p) => String(p.id) === String(id))
  const filteredRows = useMemo(
    () =>
      (units ?? [])
        .map((u) => {
          const proj = projectByPrecintId(u.precintId)
          return {
            id: u.unitId,
            unitId: u.unitId,
            project: proj?.name ?? u.propertyName ?? '',
            unit: u.unitNo,
            location: proj?.location ?? '',
            type: u.model,
            bedrooms: u.bedrooms,
            sizeSqft: u.buildAreaSqft ?? u.totalAreaSqft,
            priceAed: u.sellingPriceAed,
            status: u.status,
            statusLabel: u.statusLabel,
          }
        })
        // Unit_Search has no size parameter — applied client-side against the already-fetched
        // page of results, unlike the other filters above which are sent to the server.
        .filter((row) => !minSize || row.sizeSqft >= Number(minSize)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [units, projectList, minSize]
  )

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
        <div className="kpi">
          <p className="label">Active leads</p>
          <p className="value">{leads?.length ?? 0}</p>
        </div>
        <div className="kpi">
          <p className="label">Active hold units</p>
          <p className="value">{bookingsSummary?.activeHolds ?? 0}</p>
        </div>
        <div className="kpi">
          <p className="label">Units reserved</p>
          <p className="value">{bookingsSummary?.reserved ?? 0}</p>
        </div>
        <div className="kpi">
          <p className="label">Commission YTD</p>
          <p className="value">{commissionsSummary?.earnedYtd ?? 'AED 0'}</p>
        </div>
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
                  <option value={p.id} key={p.id}>
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
              {SIZE_OPTIONS.map((o) => (
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
                  <th className="inv-action"></th>
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
                    <td>{row.sizeSqft?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td>{row.priceAed?.toLocaleString()}</td>
                    <td>
                      <span className={`status ${row.status}`}>{row.statusLabel ?? row.status}</span>
                    </td>
                    <td className="inv-action">
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
                        <Link className="row-cta" to={`/bookings?new=1&unitId=${row.unitId}`}>
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
              {announcements.map((a) => (
                <article key={a.id}>
                  <time>{a.date}</time>
                  <p style={{ fontFamily: 'var(--font-medium)' }}>{a.title}</p>
                  <p dangerouslySetInnerHTML={{ __html: a.description }} />
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
