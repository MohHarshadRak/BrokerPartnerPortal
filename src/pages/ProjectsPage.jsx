import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useGetProjectsQuery, useGetProjectByIdQuery } from '../features/projects/projectsApi'
import { useGetFormOptionsQuery } from '../features/lookups/lookupsApi'
import { useToast } from '../components/useToast'

const DISTRICTS = ['Downtown Mina', 'Raha Island', 'Hayat Island', 'Marjan']

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
  const kitCount = (project.kit ?? []).length
  const openUnits = (project.units ?? []).filter((u) => u.status !== 'hold').length
  return (
    <article className="pcard" onClick={() => onOpen(project.id)} tabIndex={0} role="button" aria-label={`Open ${project.name} toolkit`}>
      <div className="img">
        <span className={`tag${project.tag === 'New Launch' ? ' new' : ''}`}>{project.tag}</span>
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
            <b>{kitCount}</b> assets ready
          </span>
          <span>
            <b>{openUnits}</b> units open
          </span>
          <span>{project.status}</span>
        </div>
        <span className="kit">Open toolkit &rarr;</span>
      </div>
    </article>
  )
}

function ProjectDetail({ id, onBack }) {
  const { data: project } = useGetProjectByIdQuery(id)
  const { data: options } = useGetFormOptionsQuery()
  const { toastNode, showToast } = useToast()
  const bedroomOptions = options?.bedroomOptions ?? []
  const sizeOptions = options?.sizeOptions ?? []
  const priceOptions = options?.priceOptions ?? []
  const [unitQuery, setUnitQuery] = useState('')
  const [bedFilter, setBedFilter] = useState('')
  const [sizeFilter, setSizeFilter] = useState('')
  const [priceFilter, setPriceFilter] = useState('')
  const [monthIndex, setMonthIndex] = useState(0)
  const [videoPlaying, setVideoPlaying] = useState(false)

  const units = project?.units ?? []
  const filteredUnits = useMemo(
    () =>
      units.filter((u) => {
        const okQ = !unitQuery || u.unit?.toLowerCase().includes(unitQuery.toLowerCase())
        const okBed = !bedFilter || (bedFilter === '4' ? u.bedrooms >= 4 : u.bedrooms === Number(bedFilter))
        const okSize = !sizeFilter || u.sizeSqft >= Number(sizeFilter)
        const okPrice = !priceFilter || u.priceAed <= Number(priceFilter)
        return okQ && okBed && okSize && okPrice
      }),
    [units, unitQuery, bedFilter, sizeFilter, priceFilter]
  )
  const openUnitsCount = filteredUnits.filter((u) => u.status !== 'hold').length

  const construction = project?.construction ?? []
  const selectedMonth = construction[monthIndex]

  return (
    <section className="detail show" aria-live="polite">
      <button className="back" type="button" onClick={onBack}>
        &larr; All projects &amp; resources
      </button>

      <div className="d-hero">
        {project?.image && <img src={project.image} alt="" />}
        <div className="inner">
          <p className="eyebrow">{project?.location}</p>
          <h2>{project?.name ?? 'Loading…'}</h2>
          <p className="statusline">{project?.statusLine}</p>
        </div>
      </div>

      <div className="facts">
        {(project?.facts ?? []).map(([k, v]) => (
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
              <p>{project?.description}</p>
            </div>
          </div>

          <div className="card" style={{ marginTop: 24 }}>
            <div className="card-head">
              <h3>Available units</h3>
              <span className="count-chip">
                {units.length > 0 ? `${filteredUnits.length} units · ${openUnitsCount} open` : ''}
              </span>
            </div>
            <div className="unit-filters">
              <input type="search" placeholder="Unit no. — e.g. N-1204" aria-label="Search by unit number" value={unitQuery} onChange={(e) => setUnitQuery(e.target.value)} />
              <select aria-label="Bedrooms" value={bedFilter} onChange={(e) => setBedFilter(e.target.value)}>
                <option value="">Bedrooms — any</option>
                {bedroomOptions.map((o) => (
                  <option value={o.value} key={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <select aria-label="Minimum size" value={sizeFilter} onChange={(e) => setSizeFilter(e.target.value)}>
                <option value="">Size — any</option>
                {sizeOptions.map((o) => (
                  <option value={o.value} key={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <select aria-label="Maximum price" value={priceFilter} onChange={(e) => setPriceFilter(e.target.value)}>
                <option value="">Price — any</option>
                {priceOptions.map((o) => (
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
                  {units.length === 0 ? (
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
                          <td>{u.sizeSqft}</td>
                          <td>{u.priceAed?.toLocaleString()}</td>
                          <td>
                            <span className={`status ${u.status}`}>{u.statusLabel ?? u.status}</span>
                          </td>
                          <td>
                            {u.status === 'hold' ? (
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
                              <Link className="row-cta" to="/bookings?new=1">
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
              {(project?.gallery ?? []).length > 0 && (
                <span style={{ fontSize: 11, color: 'var(--rak-navy-60)' }}>Click to open full size</span>
              )}
            </div>
            <div className="gallery">
              {(project?.gallery ?? []).map((src, i) => (
                <a href={src} target="_blank" rel="noopener noreferrer" key={i}>
                  <img src={src} alt={`${project?.name ?? ''} render`} loading="lazy" />
                </a>
              ))}
              {(project?.gallery ?? []).length === 0 && (
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
              {(project?.kit ?? []).length === 0 && (
                <p style={{ color: 'var(--rak-navy-60)', fontSize: 13, padding: '14px 24px' }}>No assets attached yet.</p>
              )}
              {(project?.kit ?? []).map((item, i) => (
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
            {(project?.kit ?? []).length > 0 && (
              <div className="kit-foot">
                <button
                  className="btn"
                  type="button"
                  onClick={() =>
                    showToast(`Preparing the ${project?.name ?? ''} marketing kit — your download will begin shortly.`)
                  }
                >
                  Download full kit (.zip)
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
  const [masterplan, setMasterplan] = useState('all')
  const [district, setDistrict] = useState('all')
  const [query, setQuery] = useState('')

  const list = projects ?? []
  const filtered = list.filter((p) => {
    const okMp = masterplan === 'all' || p.masterplan === masterplan
    const okDist = district === 'all' || p.area === district
    const okQ = !query || p.name?.toLowerCase().includes(query.toLowerCase())
    return okMp && okDist && okQ
  })

  if (selectedId) {
    return <ProjectDetail id={selectedId} onBack={() => setSelectedId(null)} />
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
        <span className="label">Masterplan</span>
        {['all', 'Mina', 'The Strand'].map((mp) => (
          <button key={mp} className={`chip${masterplan === mp ? ' active' : ''}`} type="button" onClick={() => setMasterplan(mp)}>
            {mp === 'all' ? 'All' : mp}
          </button>
        ))}
        <span className="label" style={{ marginLeft: 8 }}>
          District
        </span>
        <button className={`chip${district === 'all' ? ' active' : ''}`} type="button" onClick={() => setDistrict('all')}>
          All
        </button>
        {DISTRICTS.map((d) => (
          <button key={d} className={`chip${district === d ? ' active' : ''}`} type="button" onClick={() => setDistrict(d)}>
            {d === 'Marjan' ? 'Marjan Beach' : d}
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
