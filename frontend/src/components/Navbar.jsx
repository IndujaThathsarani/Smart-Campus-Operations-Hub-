import RoleNavbar from './RoleNavbar'
import { useEffect, useMemo, useState } from 'react'
import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiGet } from '../services/apiClient'

export default function Navbar() {
  const { isAuthenticated } = useAuth()
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
    const handleNotificationRefresh = () => {
      loadUnreadCount()
    }

    window.addEventListener('notifications:refresh', handleNotificationRefresh)

    return () => {
      isMounted = false
      window.clearInterval(timerId)
      window.removeEventListener('notifications:refresh', handleNotificationRefresh)
    }
  }, [isAuthenticated])

  return (
    <>
      <RoleNavbar variant="user" />

      {isAuthenticated && (
        <Link
          to="/notifications"
          aria-label="Open notifications"
          title="Notifications"
          className="fixed bottom-6 right-6 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full border border-sky-300/30 bg-slate-950/90 text-white shadow-[0_18px_40px_rgba(2,132,199,0.35)] backdrop-blur-md transition duration-200 hover:-translate-y-1 hover:bg-sky-500 hover:shadow-[0_22px_45px_rgba(14,165,233,0.45)]"
        >
          <Bell className="h-6 w-6" strokeWidth={2.1} />
          {unreadLabel && (
            <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full border border-white/20 bg-sky-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm">
              {unreadLabel}
            </span>
          )}
        </Link>
      )}
    </>
  )
}
