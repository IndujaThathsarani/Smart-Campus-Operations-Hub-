import { useEffect, useMemo, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiGet, apiSend } from '../services/apiClient'
import { resolveNotificationTarget } from '../utils/notificationRoutes'

export default function FloatingNotificationsBell() {
  const { isAuthenticated, roles } = useAuth()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState('all')
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [busyNotificationId, setBusyNotificationId] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)

  const unreadLabel = useMemo(() => {
    if (unreadCount <= 0) return ''
    return unreadCount > 99 ? '99+' : String(unreadCount)
  }, [unreadCount])

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'unread') {
      return notifications.filter((notification) => !notification?.read)
    }
    return notifications
  }, [activeFilter, notifications])

  const refreshNotifications = async () => {
    if (!isAuthenticated) {
      setNotifications([])
      setUnreadCount(0)
      return
    }

    setLoading(true)
    try {
      const data = await apiGet('/api/notifications/me')
      const list = Array.isArray(data) ? data : []
      setNotifications(list)
      setUnreadCount(list.reduce((count, item) => count + (item?.read ? 0 : 1), 0))
    } catch {
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }

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
      if (isOpen) {
        refreshNotifications()
      }
    }

    window.addEventListener('notifications:refresh', handleNotificationRefresh)

    return () => {
      isMounted = false
      window.clearInterval(timerId)
      window.removeEventListener('notifications:refresh', handleNotificationRefresh)
    }
  }, [isAuthenticated, isOpen])

  useEffect(() => {
    if (isOpen) {
      refreshNotifications()
    }
  }, [isOpen, isAuthenticated])

  const closePanel = () => {
    setIsOpen(false)
  }

  const markAsRead = async (notificationId) => {
    await apiSend(`/api/notifications/${notificationId}/read`, { method: 'PUT' })
    window.dispatchEvent(new Event('notifications:refresh'))
  }

  const handleNotificationClick = async (notification) => {
    const target = resolveNotificationTarget(notification, roles)

    try {
      if (!notification?.read) {
        setBusyNotificationId(notification.id)
        await markAsRead(notification.id)
      }
    } finally {
      setBusyNotificationId(null)
      setIsOpen(false)
      navigate(target)
    }
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close notifications"
          className="fixed inset-0 z-40 cursor-default bg-transparent"
          onClick={closePanel}
        />
      )}

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {isOpen && (
          <section className="w-[min(92vw,24rem)] overflow-hidden rounded-[1.5rem] border border-sky-300/20 bg-slate-950/95 text-slate-100 shadow-[0_24px_60px_rgba(15,23,42,0.45)] backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-white">Notifications</h2>
                <p className="text-xs text-slate-400">Tap one to open the related screen.</p>
              </div>
              <button
                type="button"
                onClick={closePanel}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
                aria-label="Close notification panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-2 px-4 pt-4">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${activeFilter === 'all' ? 'bg-sky-500 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'}`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('unread')}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${activeFilter === 'unread' ? 'bg-sky-500 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'}`}
              >
                Unread
              </button>
            </div>

            <div className="max-h-[32rem] space-y-2 overflow-y-auto px-4 py-4">
              {loading ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-slate-400">
                  Loading notifications...
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-slate-400">
                  No notifications to show.
                </div>
              ) : (
                filteredNotifications.map((notification) => {
                  const isBusy = busyNotificationId === notification.id

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => handleNotificationClick(notification)}
                      disabled={isBusy}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition duration-200 ${notification.read ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-sky-400/25 bg-sky-500/10 hover:bg-sky-500/15'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-white">{notification.title}</p>
                            {!notification.read && (
                              <span className="rounded-full bg-sky-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                New
                              </span>
                            )}
                          </div>
                          <p className="mt-1 line-clamp-2 text-sm text-slate-300">{notification.message}</p>
                          <p className="mt-2 text-[11px] text-slate-500">
                            {notification.type} · {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {isBusy && (
                          <span className="mt-0.5 text-[11px] font-medium text-sky-300">Opening...</span>
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </section>
        )}

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label="Open notifications"
          title="Notifications"
          className="relative inline-flex h-14 w-14 items-center justify-center rounded-full border border-sky-300/30 bg-slate-950/90 text-white shadow-[0_18px_40px_rgba(2,132,199,0.35)] backdrop-blur-md transition duration-200 hover:-translate-y-1 hover:bg-sky-500 hover:shadow-[0_22px_45px_rgba(14,165,233,0.45)]"
        >
          <Bell className="h-6 w-6" strokeWidth={2.1} />
          {unreadLabel && (
            <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full border border-white/20 bg-sky-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm">
              {unreadLabel}
            </span>
          )}
        </button>
      </div>
    </>
  )
}