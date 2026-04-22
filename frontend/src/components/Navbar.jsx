import { NavLink } from 'react-router-dom'
import './Navbar.css'

const linkClass = ({ isActive }) =>
  isActive ? 'nav-link nav-link-active' : 'nav-link'

export default function Navbar() {
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
          <NavLink to="/admin/catalogue" className={linkClass}>
            Admin Catalogue
          </NavLink>
          <NavLink to="/bookings" className={linkClass}>
            Bookings
          </NavLink>
          <NavLink to="/tickets" className={linkClass}>
            Tickets
          </NavLink>
          <NavLink to="/notifications" className={linkClass}>
            Notifications
          </NavLink>
        </nav>
      </div>
    </header>
  )
}
