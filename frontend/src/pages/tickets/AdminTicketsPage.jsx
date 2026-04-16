import { useCallback, useEffect, useMemo, useState } from 'react'
import { TICKET_CATEGORIES, TICKET_PRIORITIES } from '../../constants/ticketOptions'
import { apiDelete, apiGet, apiSend } from '../../services/apiClient'

const ADMIN_TABS = [
  { id: 'view_all', label: '1. View all tickets' },
  { id: 'change_status', label: '2. Change ticket status' },
  { id: 'reject_reason', label: '3. Reject with reason' },
  { id: 'assign_staff', label: '4. Assign technician/staff' },
  { id: 'filters', label: '5. Filters' },
  { id: 'comment_moderation', label: '6. Comment moderation' },
]

const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']

const FILTER_STATUS_OPTIONS = [
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
  'REJECTED',
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
  const [statusDrafts, setStatusDrafts] = useState({})
  const [savingId, setSavingId] = useState(null)
  const [statusActionError, setStatusActionError] = useState(null)
  const [statusActionSuccess, setStatusActionSuccess] = useState(null)
  const [rejectDrafts, setRejectDrafts] = useState({})
  const [rejectSavingId, setRejectSavingId] = useState(null)
  const [rejectError, setRejectError] = useState(null)
  const [rejectSuccess, setRejectSuccess] = useState(null)
  const [assignDrafts, setAssignDrafts] = useState({})
  const [assignSavingId, setAssignSavingId] = useState(null)
  const [assignError, setAssignError] = useState(null)
  const [assignSuccess, setAssignSuccess] = useState(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [deletingId, setDeletingId] = useState(null)

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

  const loadFilteredTickets = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filterStatus) params.set('status', filterStatus)
      if (filterPriority) params.set('priority', filterPriority)
      if (filterCategory) params.set('category', filterCategory)
      const qs = params.toString()
      const data = await apiGet(qs ? `/api/tickets?${qs}` : '/api/tickets')
      setTickets(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e?.body?.message || e?.message || 'Could not load tickets.')
      setTickets([])
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterPriority, filterCategory])

  const refreshTickets = useCallback(async () => {
    if (activeTab === 'filters') {
      await loadFilteredTickets()
    } else {
      await loadTickets()
    }
  }, [activeTab, loadFilteredTickets, loadTickets])

  useEffect(() => {
    if (
      activeTab === 'view_all' ||
      activeTab === 'change_status' ||
      activeTab === 'reject_reason' ||
      activeTab === 'assign_staff'
    ) {
      loadTickets()
    }
  }, [activeTab, loadTickets])

  useEffect(() => {
    if (activeTab === 'filters') {
      loadFilteredTickets()
    }
  }, [activeTab, loadFilteredTickets])

  const getDraft = useCallback(
    (ticket) => {
      const existing = statusDrafts[ticket.id]
      if (existing) return existing
      return {
        status: ticket.status || 'OPEN',
        rejectReason: ticket.rejectReason || '',
      }
    },
    [statusDrafts],
  )

  const updateDraft = useCallback((ticketId, patch) => {
    setStatusDrafts((prev) => {
      const current = prev[ticketId] || { status: 'OPEN', rejectReason: '' }
      return {
        ...prev,
        [ticketId]: { ...current, ...patch },
      }
    })
  }, [])

  const handleUpdateStatus = useCallback(
    async (ticket) => {
      const draft = getDraft(ticket)
      if (draft.status === 'REJECTED') {
        setStatusActionSuccess(null)
        setStatusActionError('Use the "Reject with reason" tab to reject a ticket.')
        return
      }

      setSavingId(ticket.id)
      setStatusActionError(null)
      setStatusActionSuccess(null)
      try {
        await apiSend(`/api/tickets/${ticket.id}/status`, {
          method: 'PATCH',
          body: {
            status: draft.status,
            rejectReason: draft.status === 'REJECTED' ? draft.rejectReason.trim() : null,
          },
        })
        setStatusActionSuccess(`Status updated for ticket ${ticket.id}.`)
        await refreshTickets()
      } catch (e) {
        setStatusActionError(e?.body?.message || e?.message || 'Could not update ticket status.')
      } finally {
        setSavingId(null)
      }
    },
    [getDraft, refreshTickets],
  )

  const updateRejectDraft = useCallback((ticketId, value) => {
    setRejectDrafts((prev) => ({ ...prev, [ticketId]: value }))
  }, [])

  const handleRejectWithReason = useCallback(
    async (ticket) => {
      const reason = (rejectDrafts[ticket.id] || '').trim()
      if (!reason) {
        setRejectSuccess(null)
        setRejectError('Please provide a reject reason before submitting.')
        return
      }
      setRejectSavingId(ticket.id)
      setRejectError(null)
      setRejectSuccess(null)
      try {
        await apiSend(`/api/tickets/${ticket.id}/status`, {
          method: 'PATCH',
          body: {
            status: 'REJECTED',
            rejectReason: reason,
          },
        })
        setRejectSuccess(`Ticket ${ticket.id} rejected successfully.`)
        setRejectDrafts((prev) => ({ ...prev, [ticket.id]: '' }))
        await refreshTickets()
      } catch (e) {
        setRejectError(e?.body?.message || e?.message || 'Could not reject ticket.')
      } finally {
        setRejectSavingId(null)
      }
    },
    [refreshTickets, rejectDrafts],
  )

  const getAssignDraft = useCallback(
    (ticket) => {
      if (assignDrafts[ticket.id] !== undefined) return assignDrafts[ticket.id]
      return ticket.assignedTo || ''
    },
    [assignDrafts],
  )

  const updateAssignDraft = useCallback((ticketId, value) => {
    setAssignDrafts((prev) => ({ ...prev, [ticketId]: value }))
  }, [])

  const handleSaveAssignment = useCallback(
    async (ticket) => {
      const value = (getAssignDraft(ticket) || '').trim()
      setAssignSavingId(ticket.id)
      setAssignError(null)
      setAssignSuccess(null)
      try {
        await apiSend(`/api/tickets/${ticket.id}/assignment`, {
          method: 'PATCH',
          body: { assignedTo: value || null },
        })
        setAssignSuccess(`Assignment updated for ticket ${ticket.id}.`)
        setAssignDrafts((prev) => ({ ...prev, [ticket.id]: value }))
        await refreshTickets()
      } catch (e) {
        setAssignError(e?.body?.message || e?.message || 'Could not save assignment.')
      } finally {
        setAssignSavingId(null)
      }
    },
    [getAssignDraft, refreshTickets],
  )

  const handleDeleteTicket = useCallback(
    async (ticket) => {
      const ok = window.confirm(
        `Delete ticket ${ticket.id} permanently? This cannot be undone.`,
      )
      if (!ok) return

      setDeletingId(ticket.id)
      setStatusActionError(null)
      setStatusActionSuccess(null)
      setRejectError(null)
      setAssignError(null)
      setAssignSuccess(null)
      try {
        await apiDelete(`/api/tickets/${ticket.id}`)
        setStatusDrafts((prev) => {
          const next = { ...prev }
          delete next[ticket.id]
          return next
        })
        setRejectDrafts((prev) => {
          const next = { ...prev }
          delete next[ticket.id]
          return next
        })
        setAssignDrafts((prev) => {
          const next = { ...prev }
          delete next[ticket.id]
          return next
        })
        setStatusActionSuccess(`Ticket ${ticket.id} deleted.`)
        setRejectSuccess(null)
        await refreshTickets()
      } catch (e) {
        const msg = e?.body?.message || e?.message || 'Could not delete ticket.'
        setStatusActionError(msg)
        setRejectError(msg)
      } finally {
        setDeletingId(null)
      }
    },
    [refreshTickets],
  )

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

              {statusActionSuccess && (
                <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {statusActionSuccess}
                </p>
              )}
              {statusActionError && (
                <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {statusActionError}
                </p>
              )}

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
                          Assigned to
                        </th>
                        <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-slate-700">
                          Created
                        </th>
                        <th className="border-b border-gray-200 px-3 py-2 text-right font-semibold text-slate-700">
                          Actions
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
                          <td className="max-w-[10rem] border-b border-gray-100 px-3 py-2 text-slate-700">
                            {ticket.assignedTo || '—'}
                          </td>
                          <td className="border-b border-gray-100 px-3 py-2 text-slate-600">
                            {formatDate(ticket.createdAt)}
                          </td>
                          <td className="border-b border-gray-100 px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteTicket(ticket)}
                              disabled={deletingId === ticket.id}
                              className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deletingId === ticket.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : activeTab === 'change_status' ? (
            <>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">Change ticket status</h2>
                <button
                  type="button"
                  onClick={loadTickets}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100"
                >
                  Refresh
                </button>
              </div>

              {statusActionError && (
                <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {statusActionError}
                </p>
              )}
              {statusActionSuccess && (
                <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {statusActionSuccess}
                </p>
              )}

              {loading && (
                <div className="rounded-md border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
                  Loading tickets...
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
                          Priority
                        </th>
                        <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-slate-700">
                          Current
                        </th>
                        <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-slate-700">
                          New status
                        </th>
                        <th className="border-b border-gray-200 px-3 py-2 text-right font-semibold text-slate-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.map((ticket) => {
                        const draft = getDraft(ticket)
                        const isSaving = savingId === ticket.id
                        return (
                          <tr key={ticket.id} className="odd:bg-white even:bg-slate-50/60">
                            <td className="border-b border-gray-100 px-3 py-2 font-mono text-xs text-slate-600">
                              {ticket.id}
                            </td>
                            <td className="border-b border-gray-100 px-3 py-2 text-slate-700">
                              {ticket.location || '—'}
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
                            <td className="border-b border-gray-100 px-3 py-2">
                              <select
                                value={draft.status}
                                onChange={(e) => updateDraft(ticket.id, { status: e.target.value })}
                                disabled={isSaving || deletingId === ticket.id}
                                className="w-full min-w-[11rem] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                              >
                                {STATUS_OPTIONS.map((status) => (
                                  <option key={status} value={status}>
                                    {formatEnum(status)}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="border-b border-gray-100 px-3 py-2">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(ticket)}
                                  disabled={isSaving || deletingId === ticket.id}
                                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isSaving ? 'Saving...' : 'Update'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTicket(ticket)}
                                  disabled={deletingId === ticket.id || isSaving}
                                  className="rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {deletingId === ticket.id ? 'Deleting...' : 'Delete'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : activeTab === 'reject_reason' ? (
            <>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">Reject with reason</h2>
                <button
                  type="button"
                  onClick={loadTickets}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100"
                >
                  Refresh
                </button>
              </div>

              <p className="mb-3 text-sm text-gray-600">
                This action sets the ticket status to <strong>REJECTED</strong> and stores the
                reason for user visibility.
              </p>

              {rejectError && (
                <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {rejectError}
                </p>
              )}
              {rejectSuccess && (
                <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {rejectSuccess}
                </p>
              )}

              {loading && (
                <div className="rounded-md border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
                  Loading tickets...
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

              {!loading && !error && tickets.filter((t) => t.status !== 'REJECTED').length === 0 && (
                <div className="rounded-md border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
                  All available tickets are already rejected.
                </div>
              )}

              {!loading && !error && tickets.filter((t) => t.status !== 'REJECTED').length > 0 && (
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
                          Current
                        </th>
                        <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-slate-700">
                          Reject reason
                        </th>
                        <th className="border-b border-gray-200 px-3 py-2 text-right font-semibold text-slate-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets
                        .filter((ticket) => ticket.status !== 'REJECTED')
                        .map((ticket) => {
                          const isSaving = rejectSavingId === ticket.id
                          return (
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
                              <td className="border-b border-gray-100 px-3 py-2">
                                <input
                                  type="text"
                                  placeholder="Mandatory reject reason"
                                  value={rejectDrafts[ticket.id] || ''}
                                  onChange={(e) => updateRejectDraft(ticket.id, e.target.value)}
                                  disabled={isSaving || deletingId === ticket.id}
                                  className="w-full min-w-[14rem] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-gray-100"
                                />
                              </td>
                              <td className="border-b border-gray-100 px-3 py-2">
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleRejectWithReason(ticket)}
                                    disabled={isSaving || deletingId === ticket.id}
                                    className="rounded-md bg-red-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {isSaving ? 'Rejecting...' : 'Reject'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTicket(ticket)}
                                    disabled={deletingId === ticket.id || isSaving}
                                    className="rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {deletingId === ticket.id ? 'Deleting...' : 'Delete'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : activeTab === 'assign_staff' ? (
            <>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">Assign technician/staff</h2>
                <button
                  type="button"
                  onClick={loadTickets}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100"
                >
                  Refresh
                </button>
              </div>

              <p className="mb-3 text-sm text-gray-600">
                Enter a staff name or ID. Clear the field and save to unassign. (Module E can later
                replace this with a real user picker.)
              </p>

              {assignError && (
                <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {assignError}
                </p>
              )}
              {assignSuccess && (
                <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {assignSuccess}
                </p>
              )}

              {loading && (
                <div className="rounded-md border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
                  Loading tickets...
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
                          Assign to
                        </th>
                        <th className="border-b border-gray-200 px-3 py-2 text-right font-semibold text-slate-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.map((ticket) => {
                        const draft = getAssignDraft(ticket)
                        const isSaving = assignSavingId === ticket.id
                        return (
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
                            <td className="border-b border-gray-100 px-3 py-2">
                              <input
                                type="text"
                                placeholder="Name or staff ID"
                                value={draft}
                                onChange={(e) => updateAssignDraft(ticket.id, e.target.value)}
                                disabled={isSaving || deletingId === ticket.id}
                                maxLength={200}
                                className="w-full min-w-[12rem] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-gray-100"
                              />
                            </td>
                            <td className="border-b border-gray-100 px-3 py-2">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleSaveAssignment(ticket)}
                                  disabled={isSaving || deletingId === ticket.id}
                                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isSaving ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTicket(ticket)}
                                  disabled={deletingId === ticket.id || isSaving}
                                  className="rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {deletingId === ticket.id ? 'Deleting...' : 'Delete'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : activeTab === 'filters' ? (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
                <button
                  type="button"
                  onClick={loadFilteredTickets}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100"
                >
                  Refresh
                </button>
              </div>

              <p className="mb-3 text-sm text-gray-600">
                Filter by status, priority, and/or category. Results are returned newest first.
              </p>

              <div className="mb-4 flex flex-wrap items-end gap-3">
                <div className="flex min-w-[10rem] flex-col gap-1">
                  <label htmlFor="filter-status" className="text-xs font-medium text-gray-600">
                    Status
                  </label>
                  <select
                    id="filter-status"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="">All statuses</option>
                    {FILTER_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {formatEnum(s)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex min-w-[10rem] flex-col gap-1">
                  <label htmlFor="filter-priority" className="text-xs font-medium text-gray-600">
                    Priority
                  </label>
                  <select
                    id="filter-priority"
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="">All priorities</option>
                    {TICKET_PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex min-w-[12rem] flex-col gap-1">
                  <label htmlFor="filter-category" className="text-xs font-medium text-gray-600">
                    Category
                  </label>
                  <select
                    id="filter-category"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="">All categories</option>
                    {TICKET_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFilterStatus('')
                    setFilterPriority('')
                    setFilterCategory('')
                  }}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                >
                  Clear filters
                </button>
              </div>

              {loading && (
                <div className="rounded-md border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
                  Loading tickets...
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
                  No tickets match these filters.
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
                          Assigned to
                        </th>
                        <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-slate-700">
                          Created
                        </th>
                        <th className="border-b border-gray-200 px-3 py-2 text-right font-semibold text-slate-700">
                          Actions
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
                          <td className="max-w-[10rem] border-b border-gray-100 px-3 py-2 text-slate-700">
                            {ticket.assignedTo || '—'}
                          </td>
                          <td className="border-b border-gray-100 px-3 py-2 text-slate-600">
                            {formatDate(ticket.createdAt)}
                          </td>
                          <td className="border-b border-gray-100 px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteTicket(ticket)}
                              disabled={deletingId === ticket.id}
                              className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deletingId === ticket.id ? 'Deleting...' : 'Delete'}
                            </button>
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
