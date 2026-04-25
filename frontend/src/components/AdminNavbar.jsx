import { Link } from 'react-router-dom'
import './Navbar.css'

export default function AdminNavbar() {
  return (
    <header className="app-header">
      <div className="nav-inner">
        <span className="nav-brand">{'Admin · Incident & maintenance'}</span>
        <nav className="nav-links" aria-label="Admin navigation">
          <Link to="/tickets" className="nav-link">
            User tickets
          </Link>
          <Link to="/resources" className="nav-link">
            Resources
          </Link>
          <Link to="/admin/bookings" className="nav-link">
            Bookings
          </Link>
          <Link to="/notifications" className="nav-link">
            Notifications
          </Link>
        </nav>
      </div>
    </header>
  )
}
