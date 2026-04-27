import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { apiGet, apiSend } from '../../services/apiClient'
import { resolveNotificationTarget } from '../../utils/notificationRoutes'

export default function NotificationsPage() {
  const { roles } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all')
  const [busyNotificationId, setBusyNotificationId] = useState(null)

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'unread') {
      return notifications.filter((notification) => !notification?.read)
    }
    return notifications
  }, [activeFilter, notifications])

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    try {
      const data = await apiGet('/api/notifications/me')
      setNotifications(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load notifications:', error)
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId) => {
    try {
      await apiSend(`/api/notifications/${notificationId}/read`, { method: 'PUT' })
      loadNotifications()
      window.dispatchEvent(new Event('notifications:refresh'))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
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
      navigate(target)
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="page-title">Notifications</h1>
        <p className="page-lead">
          Booking changes, ticket updates, account changes, and new comments will appear here.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeFilter === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50'}`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('unread')}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeFilter === 'unread' ? 'bg-sky-600 text-white shadow-sm' : 'bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50'}`}
        >
          Unread
        </button>
      </div>

      {loading ? (
        <div className="rounded-lg bg-white p-6 shadow-sm text-gray-500">Loading notifications...</div>
      ) : filteredNotifications.length === 0 ? (
        <div className="rounded-lg bg-white p-6 shadow-sm text-gray-500">
          {activeFilter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => {
            const isBusy = busyNotificationId === notification.id

            return (
            <article
              key={notification.id}
              role="button"
              tabIndex={0}
              onClick={() => handleNotificationClick(notification)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  handleNotificationClick(notification)
                }
              }}
              className={`cursor-pointer rounded-xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${notification.read ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-gray-900">{notification.title}</h2>
                    {!notification.read && (
                      <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                        New
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
                  <p className="mt-2 text-xs text-gray-400">
                    {notification.type} · {new Date(notification.createdAt).toLocaleString()}
                  </p>
                  {(notification.entityType || notification.entityId) && (
                    <p className="mt-1 text-xs text-gray-400">
                      {notification.entityType && <span>{notification.entityType}</span>}
                      {notification.entityType && notification.entityId && <span> · </span>}
                      {notification.entityId && <span>{notification.entityId}</span>}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {isBusy && (
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                      Opening...
                    </span>
                  )}
                  {!notification.read && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      markAsRead(notification.id)
                    }}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    Mark Read
                  </button>
                  )}
                </div>
              </div>
            </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
