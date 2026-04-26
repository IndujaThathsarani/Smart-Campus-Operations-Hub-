import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiGet } from '../services/apiClient'

const NAVBAR_LINKS = {
  user: [
    { to: '/', label: 'Home', end: true },
    { to: '/resources', label: 'Resources' },
    { to: '/tickets', label: 'Tickets' },
    { to: '/bookings', label: 'Bookings' },
    { to: '/notifications', label: 'Notifications' },
  ],
  technician: [
    { to: '/', label: 'Home', end: true },
    { to: '/resources', label: 'Resources' },
    { to: '/technician/tickets', label: 'Tickets' },
    { to: '/notifications', label: 'Notifications' },
  ],
  admin: [
    { to: '/admin/catalogue', label: 'Admin Catalogue' },
    { to: '/admin/tickets', label: 'Admin Tickets' },
    { to: '/bookings', label: 'Bookings' },
    { to: '/notifications', label: 'Notifications' },
  ],
  systemAdmin: [
    { to: '/system-admin/dashboard', label: 'System Admin' },
    { to: '/admin/catalogue', label: 'Admin Catalogue' },
    { to: '/admin/tickets', label: 'Admin Tickets' },
    { to: '/bookings', label: 'Bookings' },
    { to: '/notifications', label: 'Notifications' },
  ],
}

const linkClass = ({ isActive }) =>
  [
    'rounded-md px-3 py-1.5 text-sm font-medium transition duration-200',
    isActive
      ? 'bg-white/12 text-white shadow-sm ring-1 ring-white/10'
      : 'text-slate-300 hover:bg-white/8 hover:text-white',
  ].join(' ')

export default function RoleNavbar({ variant = 'user' }) {
  const { isAuthenticated, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const links = NAVBAR_LINKS[variant] || NAVBAR_LINKS.user
  const [unreadCount, setUnreadCount] = useState(0)

  const unreadLabel = useMemo(() => {
    if (unreadCount <= 0) return ''
    return unreadCount > 99 ? '99+' : String(unreadCount)
  }, [unreadCount])

  useEffect(() => {
    let isMounted = true

    const loadUnreadCount = async () => {
      if (!isAuthenticated) {
        if (isMounted) setUnreadCount(0)
        return
      }

      try {
        const data = await apiGet('/api/notifications/me')
        const list = Array.isArray(data) ? data : []
        const unread = list.reduce((count, item) => count + (item?.read ? 0 : 1), 0)
        if (isMounted) {
          setUnreadCount(unread)
        }
      } catch {
        if (isMounted) {
          setUnreadCount(0)
        }
      }
    }

    loadUnreadCount()
    const timerId = window.setInterval(loadUnreadCount, 60000)

    return () => {
      isMounted = false
      window.clearInterval(timerId)
    }
  }, [isAuthenticated, location.pathname])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <header className="border-b border-white/10 bg-slate-950 text-slate-100 shadow-[0_1px_0_rgba(255,255,255,0.06)]">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="shrink-0 text-lg font-semibold tracking-[0.02em] text-white transition hover:text-slate-200"
        >
          <span>SmartCampus</span>
          <span className="text-sky-400">Hub</span>
        </Link>

        <nav className="flex min-w-0 flex-1 flex-wrap justify-center gap-1" aria-label="Primary">
          {isAuthenticated &&
            links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={linkClass}
              >
                <span className="inline-flex items-center gap-2">
                  <span>{link.label}</span>
                  {link.to === '/notifications' && unreadLabel && (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-sky-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                      {unreadLabel}
                    </span>
                  )}
                </span>
              </NavLink>
            ))}
        </nav>

        {isAuthenticated && (
          <button
            type="button"
            onClick={handleLogout}
            className="shrink-0 rounded-md bg-red-500/15 px-3 py-1.5 text-sm font-medium text-red-200 transition hover:bg-red-500/25 hover:text-white"
          >
            LOGOUT
          </button>
        )}
      </div>
    </header>
  )
}
