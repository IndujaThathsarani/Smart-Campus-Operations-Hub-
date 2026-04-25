import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Navbar.css'

const linkClass = ({ isActive }) =>
  isActive ? 'nav-link nav-link-active' : 'nav-link'

export default function Navbar() {
  const { isAuthenticated, logout, roles } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const hasRole = (role) => roles && roles.includes(role)
  const isSystemAdmin = hasRole('ROLE_SYSTEM_ADMIN')
  const isAdmin = hasRole('ROLE_ADMIN')
  const isTechnician = hasRole('ROLE_TECHNICIAN')
  const isUser = hasRole('ROLE_USER')

  return (
    <header className="app-header">
      <div className="nav-inner">
        <span className="nav-brand">Smart Campus Hub</span>
        <nav className="nav-links" aria-label="Main">
          <NavLink to="/" end className={linkClass}>
            HOME
          </NavLink>

          {/* User Resources - available to all authenticated users */}
          {isAuthenticated && (
            <NavLink to="/resources" className={linkClass}>
              Resources
            </NavLink>
          )}

          {/* Bookings - all authenticated users except TECHNICIAN */}
          {isAuthenticated && (isUser || isAdmin || isSystemAdmin) && (
            <NavLink to="/bookings" className={linkClass}>
              Bookings
            </NavLink>
          )}

          {/* User Tickets - available to USERS, ADMIN, TECHNICIAN, SYSTEM_ADMIN */}
          {isAuthenticated && (
            <NavLink to="/tickets" className={linkClass}>
              Tickets
            </NavLink>
          )}

          {/* Notifications - available to all authenticated users */}
          {isAuthenticated && (
            <NavLink to="/notifications" className={linkClass}>
              Notifications
            </NavLink>
          )}

          {/* Logout Button - authenticated users only */}
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
