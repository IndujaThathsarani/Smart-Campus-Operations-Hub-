import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const linkClass = ({ isActive }) =>
  [
    'rounded-md px-3 py-1.5 text-sm font-medium transition',
    isActive
      ? 'bg-white/12 text-white shadow-sm ring-1 ring-white/10'
      : 'text-slate-300 hover:bg-white/8 hover:text-white',
  ].join(' ')

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
    <header className="border-b border-white/10 bg-slate-950 text-slate-100 shadow-[0_1px_0_rgba(255,255,255,0.06)]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <span className="font-semibold tracking-[0.02em]">Smart Campus Hub</span>
        <nav className="flex flex-wrap gap-1" aria-label="Main">
          <NavLink to="/" end className={linkClass}>
            HOME
          </NavLink>

          {/* User Resources - available to all authenticated users */}
          {isAuthenticated && (
            <NavLink to="/resources" className={linkClass}>
              Resources
            </NavLink>
          )}

          {/* Admin Catalogue - ADMIN and SYSTEM_ADMIN only */}
          {(isAdmin || isSystemAdmin) && (
            <NavLink to="/admin/catalogue" className={linkClass}>
              Admin Catalogue
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

          {/* Technician Dashboard - TECHNICIAN, ADMIN, SYSTEM_ADMIN only */}
          {(isTechnician || isAdmin || isSystemAdmin) && (
            <NavLink to="/technician/tickets" className={linkClass}>
              Technician
            </NavLink>
          )}

          {/* Admin Tickets - ADMIN and SYSTEM_ADMIN only */}
          {(isAdmin || isSystemAdmin) && (
            <NavLink to="/admin/tickets" className={linkClass}>
              Admin Tickets
            </NavLink>
          )}

          {/* Notifications - available to all authenticated users */}
          {isAuthenticated && (
            <NavLink to="/notifications" className={linkClass}>
              Notifications
            </NavLink>
          )}

          {/* System Admin Dashboard - SYSTEM_ADMIN only */}
          {isSystemAdmin && (
            <NavLink to="/system-admin/dashboard" className={linkClass}>
              System Admin
            </NavLink>
          )}

          {/* Logout Button - authenticated users only */}
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="rounded-md bg-red-500/15 px-3 py-1.5 text-sm font-medium text-red-200 transition hover:bg-red-500/25 hover:text-white"
            >
              LOGOUT
            </button>
          )}
        </nav>
      </div>
    </header>
  )
}
