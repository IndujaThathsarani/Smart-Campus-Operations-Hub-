import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiGet } from '../../services/apiClient'

const ADMIN_TABS = [
  { id: 'view_all', label: '1. View all tickets' },
  { id: 'change_status', label: '2. Change ticket status' },
  { id: 'reject_reason', label: '3. Reject with reason' },
  { id: 'assign_staff', label: '4. Assign technician/staff' },
  { id: 'filters', label: '5. Filters' },
  { id: 'comment_moderation', label: '6. Comment moderation' },
]

function formatEnum(value) {
  if (!value) return '—'
  return String(value).replaceAll('_', ' ')
}

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return String(iso)
  }
}

function priorityClasses(priority) {
  switch ((priority || '').toLowerCase()) {
    case 'urgent':
      return 'bg-red-50 text-red-700'
    case 'high':
      return 'bg-orange-50 text-orange-700'
    case 'medium':
      return 'bg-blue-50 text-blue-700'
    case 'low':
      return 'bg-emerald-50 text-emerald-700'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

function StatusPill({ status }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
      {formatEnum(status)}
    </span>
  )
}

export default function AdminTicketsPage() {
  const [activeTab, setActiveTab] = useState('view_all')
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadTickets = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiGet('/api/tickets')
      setTickets(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e?.body?.message || e?.message || 'Could not load tickets.')
      setTickets([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'view_all') {
      loadTickets()
    }
  }, [activeTab, loadTickets])

  const activeTabLabel = useMemo(
    () => ADMIN_TABS.find((tab) => tab.id === activeTab)?.label ?? 'Admin task',
    [activeTab],
  )

  return (
    <section className="max-w-6xl">
      <h1 className="mb-2 text-2xl font-semibold text-slate-900">Admin: Incident ticket operations</h1>
      <p className="mb-5 text-sm leading-relaxed text-gray-600">
        Manage maintenance and incident tickets across the full admin workflow.
      </p>

      <div className="grid gap-4 md:grid-cols-[16rem,1fr]">
        <aside className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <h2 className="mb-2 px-2 text-sm font-semibold text-slate-800">Admin tasks</h2>
          <nav aria-label="Admin ticket tasks" className="space-y-1">
            {ADMIN_TABS.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </aside>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          {activeTab === 'view_all' ? (
            <>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">View all tickets</h2>
                <button
                  type="button"
                  onClick={loadTickets}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100"
                >
                  Refresh
                </button>
              </div>

              {loading && (
                <div className="rounded-md border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
                  Loading all tickets...
                </div>
              )}

              {!loading && error && (
                <div
                  className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                  role="alert"
                >
                  {error}
                </div>
              )}

              {!loading && !error && tickets.length === 0 && (
                <div className="rounded-md border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
                  No tickets found in the database.
                </div>
              )}

              {!loading && !error && tickets.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-0 text-sm">
                    <thead>
                      <tr>
                        <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-slate-700">
                          Ticket ID
                        </th>
                        <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-slate-700">
                          Location
                        </th>
                        <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-slate-700">
                          Category
                        </th>
                        <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-slate-700">
                          Priority
                        </th>
                        <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-slate-700">
                          Status
                        </th>
                        <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-slate-700">
                          Created
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.map((ticket) => (
                        <tr key={ticket.id} className="odd:bg-white even:bg-slate-50/60">
                          <td className="border-b border-gray-100 px-3 py-2 font-mono text-xs text-slate-600">
                            {ticket.id}
                          </td>
                          <td className="border-b border-gray-100 px-3 py-2 text-slate-700">
                            {ticket.location || '—'}
                          </td>
                          <td className="border-b border-gray-100 px-3 py-2 text-slate-700">
                            {formatEnum(ticket.category)}
                          </td>
                          <td className="border-b border-gray-100 px-3 py-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${priorityClasses(ticket.priority)}`}
                            >
                              {ticket.priority || '—'}
                            </span>
                          </td>
                          <td className="border-b border-gray-100 px-3 py-2">
                            <StatusPill status={ticket.status} />
                          </td>
                          <td className="border-b border-gray-100 px-3 py-2 text-slate-600">
                            {formatDate(ticket.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-md border border-dashed border-gray-300 px-4 py-8 text-center">
              <p className="text-sm font-medium text-slate-700">{activeTabLabel}</p>
              <p className="mt-1 text-sm text-gray-500">
                UI placeholder created. We can implement this task next.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
