import { NavLink, Outlet } from 'react-router-dom'
import './AdminLayout.css'

const navClass = ({ isActive }) =>
  isActive ? 'admin-shell-nav-link admin-shell-nav-link-active' : 'admin-shell-nav-link'

export default function AdminLayout() {
  return (
    <div className="admin-shell">
      <aside className="admin-shell-sidebar">
        <div className="admin-shell-brand">
          <p className="admin-shell-kicker">Smart Campus</p>
          <h1>Admin Console</h1>
        </div>

        <nav className="admin-shell-nav" aria-label="Admin">
          <NavLink to="/admin/bookings" className={navClass}>
            Booking Control
          </NavLink>
        </nav>
      </aside>

      <main className="admin-shell-main">
        <Outlet />
      </main>
    </div>
  )
}
