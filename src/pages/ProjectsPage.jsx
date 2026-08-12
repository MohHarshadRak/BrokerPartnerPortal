import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useGetProjectsQuery,
  useGetProjectByIdQuery,
  useSearchUnitsQuery,
  useGetMarketingKitQuery,
  useDownloadMarketingKitMutation,
} from '../features/projects/projectsApi'
import { useToast } from '../components/useToast'

// Static — the Available units filters don't need a lookups round trip.
// Value -1 means "any"; bedroom '4' means "4BR+" (see filteredUnits' bedFilter check below).
const BEDROOM_OPTIONS = [
  { value: '-1', label: 'Bedrooms - any' },
  { value: '0', label: 'Studio' },
  { value: '1', label: '1BR' },
  { value: '2', label: '2BR' },
  { value: '3', label: '3BR' },
  { value: '4', label: '4BR+' },
]
const SIZE_OPTIONS = [
  { value: '-1', label: 'Size - any' },
  { value: '500', label: '500+' },
  { value: '750', label: '750+' },
  { value: '1000', label: '1,000+' },
  { value: '1500', label: '1,500+' },
  { value: '2000', label: '2,000+' },
]
// Price values are coded bands (not AED amounts) — see PRICE_CEILINGS below for what
// each code actually filters against.
const PRICE_OPTIONS = [
  { value: '0', label: 'Price - any' },
  { value: '1', label: 'upto 1 M' },
  { value: '2', label: 'upto 2M' },
  { value: '3', label: 'upto 3M' },
  { value: '4', label: 'upto 5M' },
  { value: '5', label: 'upto 10M' },
]
const PRICE_CEILINGS = { 1: 1_000_000, 2: 2_000_000, 3: 3_000_000, 4: 5_000_000, 5: 10_000_000 }

// Construction progress rows follow a fixed build-phase order, with "Overall"
// always last — matches the pattern used on rakproperties.ae project pages.
// Any keys outside the canonical set still render (just after the known
// phases) so unexpected API data isn't silently dropped.
const CONSTRUCTION_PHASE_ORDER = ['Enabling', 'Substructure', 'Superstructure', 'Finishes', 'MEP', 'External']

function orderedConstructionEntries(progress) {
  if (!progress) return []
  const known = CONSTRUCTION_PHASE_ORDER.filter((k) => progress[k] != null).map((k) => [k, progress[k]])
  const knownKeys = new Set([...CONSTRUCTION_PHASE_ORDER, 'Overall'])
  const rest = Object.entries(progress).filter(([k]) => !knownKeys.has(k))
  const overall = progress.Overall != null ? [['Overall', progress.Overall]] : []
  return [...known, ...rest, ...overall]
}

function ProjectCard({ project, onOpen }) {
  return (
    <article className="pcard" onClick={() => onOpen(project.id)} tabIndex={0} role="button" aria-label={`Open ${project.name} toolkit`}>
      <div className="img">
        {project.tag === 'New Launch' ? (
          <span className="tag new">{project.tag}</span>
        ) : (project.unitsOpen ?? 0) > 0 ? (
          <span className="tag">For Sale</span>
        ) : null}
        {project.image ? (
          <img src={project.image} alt={project.name} loading="lazy" />
        ) : (
          <span className="ph">{project.name?.charAt(0)}</span>
        )}
      </div>
      <div className="body">
        <h3>{project.name}</h3>
        <p className="loc">{project.location}</p>
        <div className="meta">
          <span>
            <b>{project.unitsOpen ?? 0}</b> units open
          </span>
          <span>{project.status}</span>
        </div>
        <span className="kit">Open toolkit &rarr;</span>
      </div>
    </article>
  )
}

function ProjectDetail({ id, precinct, onBack }) {
  const { data: project } = useGetProjectByIdQuery(id)
  const { toastNode, showToast } = useToast()
  const [unitQuery, setUnitQuery] = useState('')
  const [bedFilter, setBedFilter] = useState('-1')
  const [sizeFilter, setSizeFilter] = useState('-1')
  const [priceFilter, setPriceFilter] = useState('0')
  const [monthIndex, setMonthIndex] = useState(0)
  const [videoPlaying, setVideoPlaying] = useState(false)

  // id is the precinct id (from getProjects/BorkerPortal.GETPrecint) — Unit_Search's
  // @PrecintID. Filtering happens server-side now; priceFilter's UI code (0/1..5) is
  // converted to an actual AED ceiling (or -1 for "any") before the request goes out.
  const { data: rawUnits = [] } = useSearchUnitsQuery({
    precinctId: id,
    bedrooms: Number(bedFilter),
    size: Number(sizeFilter),
    price: priceFilter === '0' ? -1 : PRICE_CEILINGS[priceFilter],
    search: unitQuery,
  })
  // Re-derive status from statusLabel rather than trusting the API's separate status
  // field — the two have been observed out of sync (status:"hold" + statusLabel:"Available").
  // "reserved" gets its own key so it can be styled distinctly from the generic "hold" grey.
  const filteredUnits = rawUnits.map((u) => ({
    ...u,
    status:
      u.statusLabel === 'Available' ? 'available' : u.statusLabel === 'Reserved' ? 'reserved' : 'hold',
  }))
  const openUnitsCount = filteredUnits.filter((u) => u.status === 'available').length

  // Real marketing-toolkit assets (Brochure/Floor Plan/Payment Plan/etc.) for this precinct.
  const { data: kit = [] } = useGetMarketingKitQuery(id, { skip: !id })
  const [downloadMarketingKit, { isLoading: downloadingKit }] = useDownloadMarketingKitMutation()

  const handleDownloadKit = async () => {
    try {
      const blob = await downloadMarketingKit(id).unwrap()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${project?.name ?? precinct?.name ?? 'marketing-kit'}.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      showToast(err?.data?.message || 'We could not prepare the marketing kit download. Please try again.')
    }
  }

  // Real precinct summary facts (TBL_BrokerPortal_PrecintListing, via getProjects) — falls
  // back to project?.facts (still unwired) only if none of these are populated yet.
  const precinctFacts = [
    ['Destination', precinct?.location],
    ['Status', precinct?.summaryStatus],
    ['Total Units', precinct?.totalUnits],
    ['Unit Types', precinct?.unitType],
    ['Size (sq ft)', precinct?.propertySize],
    ['Completion Date', precinct?.completionDate],
    ['Property Type', precinct?.propertyType],
    ['Amenities', precinct?.amenities],
  ].filter(([, v]) => v)
  const facts = precinctFacts.length > 0 ? precinctFacts : project?.facts ?? []

  // Real precinct gallery/render images (getProjects) — falls back to project?.gallery
  // (still unwired) only if the precinct has none yet.
  const gallery = precinct?.gallery?.length > 0 ? precinct.gallery : project?.gallery ?? []

  const construction = project?.construction ?? []
  const selectedMonth = construction[monthIndex]

  return (
    <section className="detail show" aria-live="polite">
      <button className="back" type="button" onClick={onBack}>
        &larr; All projects &amp; resources
      </button>

      <div className="d-hero">
        {/* Same image/name already fetched for the precinct card on the list page (real
            data) — used here instead of "Loading…" while getProjectById is still a
            placeholder that never resolves. */}
        {(precinct?.image ?? project?.image) && <img src={precinct?.image ?? project?.image} alt="" />}
        <div className="inner">
          <p className="eyebrow">{project?.location}</p>
          <h2>{precinct?.name ?? project?.name ?? 'Loading…'}</h2>
          <p className="statusline">{project?.statusLine}</p>
        </div>
      </div>

      <div className="facts">
        {facts.map(([k, v]) => (
          <div className="fact" key={k}>
            <p className="k">{k}</p>
            <p className="v">{v}</p>
          </div>
        ))}
      </div>

      <div className="d-cols">
        <div>
          <div className="card about">
            <div className="card-head">
              <h3>Overview</h3>
              {project?.site && (
                <a className="btn ghost" href={project.site} target="_blank" rel="noopener noreferrer" style={{ minWidth: 0, height: 34, lineHeight: '31px', padding: '0 18px', fontSize: 10 }}>
                  View public page
                </a>
              )}
            </div>
            <div className="pad">
              <p className="dname">{project?.tagline}</p>
              {/* Same source as the hero image/name — TBL_BrokerPortal_PrecintListing.Description
                  via BorkerPortal.GETPrecint, left-joined so it's still null for most precincts
                  until that overlay table is populated. */}
              <p>{precinct?.description ?? project?.description}</p>
            </div>
          </div>

          <div className="card" style={{ marginTop: 24 }}>
            <div className="card-head">
              <h3>Available units</h3>
              <span className="count-chip">
                {rawUnits.length > 0 ? `${filteredUnits.length} units · ${openUnitsCount} open` : ''}
              </span>
            </div>
            <div className="unit-filters">
              <input type="search" placeholder="Unit no. — e.g. N-1204" aria-label="Search by unit number" value={unitQuery} onChange={(e) => setUnitQuery(e.target.value)} />
              <select aria-label="Bedrooms" value={bedFilter} onChange={(e) => setBedFilter(e.target.value)}>
                {BEDROOM_OPTIONS.map((o) => (
                  <option value={o.value} key={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <select aria-label="Minimum size" value={sizeFilter} onChange={(e) => setSizeFilter(e.target.value)}>
                {SIZE_OPTIONS.map((o) => (
                  <option value={o.value} key={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <select aria-label="Maximum price" value={priceFilter} onChange={(e) => setPriceFilter(e.target.value)}>
                {PRICE_OPTIONS.map((o) => (
                  <option value={o.value} key={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table aria-label="Available units">
                <thead>
                  <tr>
                    <th>Unit</th>
                    <th>Type</th>
                    <th>Size (sq ft)</th>
                    <th>Price (AED)</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rawUnits.length === 0 ? (
                    <tr className="empty-row">
                      <td colSpan={6}>
                        Inventory will appear here at launch — contact broker relations for early allocations.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {filteredUnits.map((u) => (
                        <tr key={u.unit}>
                          <td>
                            <span className="u">{u.unit}</span>
                          </td>
                          <td>{u.type}</td>
                          <td>{u.sizeSqft?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                          <td>{u.priceAed?.toLocaleString()}</td>
                          <td>
                            <span className={`status ${u.status}`}>{u.statusLabel ?? u.status}</span>
                          </td>
                          <td>
                            {u.status !== 'available' ? (
                              <a
                                className="row-cta"
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault()
                                  showToast(`Added to the ${u.unit} waitlist — we'll notify you if it frees up.`)
                                }}
                              >
                                Join waitlist
                              </a>
                            ) : (
                              <Link className="row-cta" to={`/bookings?new=1&unitId=${u.unitId}`}>
                                Reserve
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredUnits.length === 0 && (
                        <tr className="empty-row">
                          <td colSpan={6}>No units match your filters — try widening the search.</td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ marginTop: 24 }}>
            <div className="card-head">
              <h3>Gallery &amp; renders</h3>
              {gallery.length > 0 && (
                <span style={{ fontSize: 11, color: 'var(--rak-navy-60)' }}>Click to open full size</span>
              )}
            </div>
            <div className="gallery">
              {gallery.map((src, i) => (
                <a href={src} target="_blank" rel="noopener noreferrer" key={i}>
                  <img src={src} alt={`${precinct?.name ?? project?.name ?? ''} render`} loading="lazy" />
                </a>
              ))}
              {gallery.length === 0 && (
                <p style={{ color: 'var(--rak-navy-60)', fontSize: 13, padding: '24px' }}>No renders uploaded yet.</p>
              )}
            </div>
          </div>

          <div className="card" style={{ marginTop: 24 }}>
            <div className="card-head">
              <h3>Construction updates</h3>
              {construction.length > 0 && <span className="count-chip">Updated monthly</span>}
            </div>
            {construction.length > 0 && (
              <div className="cu-months" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '18px 24px 0' }}>
                {construction.map((c, i) => (
                  <button
                    key={c.month}
                    type="button"
                    className={`chip${i === monthIndex ? ' active' : ''}`}
                    onClick={() => {
                      setMonthIndex(i)
                      setVideoPlaying(false)
                    }}
                  >
                    {c.month}
                  </button>
                ))}
              </div>
            )}
            <div className="cu-body">
              {construction.length === 0 && <p className="cu-empty">No construction updates published yet.</p>}
              {selectedMonth && (
                <div style={{ marginBottom: 18 }}>
                  {orderedConstructionEntries(selectedMonth.progress).map(([label, pct]) => (
                    <div className={`cu-row${label === 'Overall' ? ' overall' : ''}`} key={label}>
                      <span className="lbl">{label}</span>
                      <span className="bar">
                        <i style={{ width: `${pct}%` }}></i>
                      </span>
                      <span className="pct">{pct}%</span>
                    </div>
                  ))}
                  {selectedMonth.videoId && (
                    <div className="cu-video" style={{ marginTop: 18 }}>
                      {videoPlaying ? (
                        <iframe
                          src={`https://www.youtube.com/embed/${selectedMonth.videoId}?autoplay=1`}
                          title="Construction update video"
                          allow="autoplay; fullscreen"
                          allowFullScreen
                          style={{ width: '100%', aspectRatio: '16/9', border: 0, display: 'block' }}
                        />
                      ) : (
                        <button
                          type="button"
                          className="cu-thumb"
                          aria-label="Play the monthly construction update video"
                          onClick={() => setVideoPlaying(true)}
                        >
                          <img
                            src={`https://img.youtube.com/vi/${selectedMonth.videoId}/hqdefault.jpg`}
                            alt=""
                            loading="lazy"
                          />
                          <span className="cu-play" aria-hidden="true"></span>
                          <span className="cu-caption">Watch the monthly update</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <aside>
          <div className="card">
            <div className="card-head">
              <h3>Marketing toolkit</h3>
            </div>
            <div className="kit-list">
              {(kit).length === 0 && (
                <p style={{ color: 'var(--rak-navy-60)', fontSize: 13, padding: '14px 24px' }}>No assets attached yet.</p>
              )}
              {(kit).map((item, i) => (
                <div className={`kit-item${item.soon ? ' soon' : ''}`} key={i}>
                  <span className="kit-ico">{item.icon}</span>
                  <div>
                    <p className="t">{item.title}</p>
                    <p className="s">{item.subtitle}</p>
                  </div>
                  {item.soon ? (
                    <span className="dl">Soon</span>
                  ) : item.url === '#' ? (
                    <a
                      className="dl dl-todo"
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        showToast("This asset hasn't been attached yet — broker relations can share it directly (toll free 800 4020).")
                      }}
                    >
                      Request
                    </a>
                  ) : (
                    <a className="dl" href={item.url} target="_blank" rel="noopener noreferrer">
                      Download
                    </a>
                  )}
                </div>
              ))}
            </div>
            {(kit).length > 0 && (
              <div className="kit-foot">
                <button className="btn" type="button" onClick={handleDownloadKit} disabled={downloadingKit}>
                  {downloadingKit ? 'Preparing…' : 'Download full kit (.zip)'}
                </button>
              </div>
            )}
          </div>
          <div className="side-cta">
            <p className="eyebrow">Have a client for this project?</p>
            <h4>Register a lead</h4>
            <p>Protect your commission — register your client before the site visit.</p>
            <Link className="btn" to="/leads?register=1">
              + Register a lead
            </Link>
          </div>
        </aside>
      </div>
      {toastNode}
    </section>
  )
}

function ProjectsPage() {
  const { data: projects } = useGetProjectsQuery()
  const [selectedId, setSelectedId] = useState(null)
  const [projectName, setProjectName] = useState('all')
  const [query, setQuery] = useState('')

  const list = projects ?? []
  // Chip options come straight from the data — one per distinct parent project name
  // (BorkerPortal.GETPrecint's joined Projects.ProjectName), not a hardcoded list.
  const projectNames = [...new Set(list.map((p) => p.projectName).filter(Boolean))]
  const filtered = list.filter((p) => {
    const okProject = projectName === 'all' || p.projectName === projectName
    const okQ = !query || p.name?.toLowerCase().includes(query.toLowerCase())
    return okProject && okQ
  })

  if (selectedId) {
    return (
      <ProjectDetail
        id={selectedId}
        precinct={list.find((p) => p.id === selectedId)}
        onBack={() => setSelectedId(null)}
      />
    )
  }

  return (
    <section className="listing">
      <p className="eyebrow">Broker Portal — Resources</p>
      <h1>Projects &amp; marketing toolkits</h1>
      <p className="lead">
        Everything you need to bring each community to your clients — live availability, brochures, factsheets, floor plans and
        construction progress, project by project.
      </p>

      <div className="filterbar">
        <span className="label">Project</span>
        {['all', ...projectNames].map((name) => (
          <button key={name} className={`chip${projectName === name ? ' active' : ''}`} type="button" onClick={() => setProjectName(name)}>
            {name === 'all' ? 'All' : name}
          </button>
        ))}
        <div className="search">
          <input type="search" placeholder="Search projects or units…" aria-label="Search projects" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="grid">
        {filtered.map((p) => (
          <ProjectCard key={p.id} project={p} onOpen={setSelectedId} />
        ))}
        {filtered.length === 0 && <p className="empty">No projects match your filters yet — check back soon.</p>}
      </div>
    </section>
  )
}

export default ProjectsPage
