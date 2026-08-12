import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { logout } from '../features/auth/authSlice'
import '../styles/portal.css'

const navLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/projects', label: 'Projects & resources' },
  { to: '/leads', label: 'My leads' },
  { to: '/bookings', label: 'Bookings' },
  { to: '/commissions', label: 'Commissions' },
  { to: '/help', label: 'Help' },
]

function initials(name) {
  if (!name) return 'BR'
  const parts = name.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

function PortalLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector((state) => state.auth.user)
  const serverUnreachable = useSelector((state) => state.ui.serverUnreachable)

  const handleLogout = () => {
    dispatch(logout())
    navigate('/')
  }

  return (
    <div className="portal">
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink className="brand" to="/dashboard" aria-label="RAK Properties — Broker Portal">
            <img src={`${import.meta.env.BASE_URL}assets/img/rak_logo.svg`} alt="RAK Properties" />
            <span className="wordmark" aria-hidden="true">
              RAK<small>PROPERTIES</small>
            </span>
          </NavLink>

          <nav className={`nav${menuOpen ? ' open' : ''}`} aria-label="Portal">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => (isActive ? 'active' : undefined)}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="user-area">
            <div className="avatar" aria-hidden="true">
              {initials(user?.fullName || user?.name)}
            </div>
            <div>
              <div className="user-name">{user?.fullName || user?.name || 'Broker'}</div>
              <div className="user-org">{user?.agency || ''}</div>
            </div>
            <button className="logout" type="button" onClick={handleLogout}>
              Log out
            </button>
          </div>

          <button
            className="burger"
            type="button"
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </header>

      {serverUnreachable && (
        <div className="offline-banner" role="alert">
          Can't reach the server — check your connection and try again.
        </div>
      )}

      <main className="page">
        <Outlet />
      </main>

      <footer>
        &reg; RAK Properties 2026 — All Rights Reserved &middot;{' '}
        <a href="https://www.rakproperties.ae/disclaimer/">Disclaimer</a>
      </footer>
    </div>
  )
}

export default PortalLayout
