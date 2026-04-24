import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Navbar.css'

const linkClass = ({ isActive }) =>
  isActive ? 'nav-link nav-link-active' : 'nav-link'

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <header className="app-header">
      <div className="nav-inner">
        <span className="nav-brand">Smart Campus Hub</span>
        <nav className="nav-links" aria-label="Main">
          <NavLink to="/" end className={linkClass}>
            HOME
          </NavLink>
          <NavLink to="/resources" className={linkClass}>
            Resources
          </NavLink>
          <a
            href="/admin/catalogue"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link"
          >
            Admin Catalogue
          </a>
          <NavLink to="/bookings" className={linkClass}>
            Bookings
          </NavLink>
          <NavLink to="/tickets" className={linkClass}>
            Tickets
          </NavLink>
          <NavLink to="/notifications" className={linkClass}>
            Notifications
          </NavLink>
          {isAuthenticated && (
            <button onClick={handleLogout} className="nav-link logout-btn">
              LOGOUT
            </button>
          )}
        </nav>
      </div>
    </header>
  )
}
