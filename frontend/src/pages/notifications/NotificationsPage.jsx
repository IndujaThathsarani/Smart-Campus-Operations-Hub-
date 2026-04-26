import { useEffect, useState } from 'react'
import { apiGet, apiSend } from '../../services/apiClient'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

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
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
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

      {loading ? (
        <div className="rounded-lg bg-white p-6 shadow-sm text-gray-500">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="rounded-lg bg-white p-6 shadow-sm text-gray-500">No notifications yet.</div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <article
              key={notification.id}
              className={`rounded-xl border p-4 shadow-sm ${notification.read ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'}`}
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
                {!notification.read && (
                  <button
                    type="button"
                    onClick={() => markAsRead(notification.id)}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    Mark Read
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
