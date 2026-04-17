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
  const [selectedTicketId, setSelectedTicketId] = useState(null)
  const [newCommentBody, setNewCommentBody] = useState('')
  const [newCommentAuthor, setNewCommentAuthor] = useState('ADMIN')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [commentActionId, setCommentActionId] = useState(null)

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
      activeTab === 'assign_staff' ||
      activeTab === 'comment_moderation'
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

  const selectedTicket = useMemo(
    () => tickets.find((t) => t.id === selectedTicketId) ?? null,
    [tickets, selectedTicketId],
  )

  const handleAddComment = useCallback(async () => {
    if (!selectedTicketId || !newCommentBody.trim()) return
    setCommentSubmitting(true)
    try {
      await apiSend(`/api/tickets/${selectedTicketId}/comments`, {
        method: 'POST',
        body: {
          body: newCommentBody.trim(),
          author: newCommentAuthor.trim() || 'ADMIN',
        },
      })
      setNewCommentBody('')
      await refreshTickets()
    } catch (e) {
      setError(e?.body?.message || e?.message || 'Could not add comment.')
    } finally {
      setCommentSubmitting(false)
    }
  }, [newCommentAuthor, newCommentBody, refreshTickets, selectedTicketId])

  const handleToggleCommentHidden = useCallback(
    async (ticketId, commentId, hidden) => {
      setCommentActionId(commentId)
      try {
        await apiSend(`/api/tickets/${ticketId}/comments/${commentId}`, {
          method: 'PATCH',
          body: { hidden },
        })
        await refreshTickets()
      } catch (e) {
        setError(e?.body?.message || e?.message || 'Could not update comment.')
      } finally {
        setCommentActionId(null)
      }
    },
    [refreshTickets],
  )

  const handleDeleteComment = useCallback(
    async (ticketId, commentId) => {
      const ok = window.confirm('Delete this comment permanently?')
      if (!ok) return
      setCommentActionId(commentId)
      try {
        await apiSend(`/api/tickets/${ticketId}/comments/${commentId}`, {
          method: 'DELETE',
        })
        await refreshTickets()
      } catch (e) {
        setError(e?.body?.message || e?.message || 'Could not delete comment.')
      } finally {
        setCommentActionId(null)
      }
    },
    [refreshTickets],
  )

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-slate-100 md:flex-row md:items-stretch">
      <aside className="flex min-h-0 w-full shrink-0 flex-col border-b border-white/10 bg-[#0f172a] text-slate-200 md:h-full md:w-60 md:border-b-0 md:border-r md:border-white/10">
        <nav
          aria-label="Admin ticket tasks"
          className="flex max-h-[38vh] flex-col gap-1 overflow-y-auto p-2 md:max-h-none md:flex-1 md:flex-col md:gap-2 md:overflow-y-visible md:px-3 md:py-4"
        >
          {ADMIN_TABS.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full shrink-0 rounded-md px-3 py-2.5 text-left text-sm transition md:flex md:min-h-0 md:flex-1 md:items-center md:justify-start md:py-0 md:leading-snug ${
                  isActive
                    ? 'bg-white/[0.14] text-white'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </nav>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {activeTab === 'view_all' ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex shrink-0 justify-end border-b border-slate-200 bg-white px-4 py-2">
                <button
                  type="button"
                  onClick={loadTickets}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100"
                >
                  Refresh
                </button>
              </div>

              {statusActionSuccess && (
                <p className="shrink-0 border-b border-emerald-100 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
                  {statusActionSuccess}
                </p>
              )}
              {statusActionError && (
                <p className="shrink-0 border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-800">
                  {statusActionError}
                </p>
              )}

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-3 pt-2">
              {loading && (
                <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
                  Loading all tickets...
                </div>
              )}

              {!loading && error && (
                <div
                  className="shrink-0 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                  role="alert"
                >
                  {error}
                </div>
              )}

              {!loading && !error && tickets.length === 0 && (
                <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
                  No tickets found in the database.
                </div>
              )}

              {!loading && !error && tickets.length > 0 && (
                <div className="min-h-0 flex-1 overflow-auto rounded-md border border-slate-200 bg-white">
                  <table className="min-w-full border-separate border-spacing-0 text-sm">
                    <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_rgb(226,232,240)]">
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
              </div>
            </div>
          ) : activeTab === 'change_status' ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex shrink-0 justify-end border-b border-slate-200 bg-white px-4 py-2">
                <button
                  type="button"
                  onClick={loadTickets}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100"
                >
                  Refresh
                </button>
              </div>

              {statusActionError && (
                <p className="shrink-0 border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-800">
                  {statusActionError}
                </p>
              )}
              {statusActionSuccess && (
                <p className="shrink-0 border-b border-emerald-100 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
                  {statusActionSuccess}
                </p>
              )}

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-3 pt-2">
              {loading && (
                <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
                  Loading tickets...
                </div>
              )}

              {!loading && error && (
                <div
                  className="shrink-0 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                  role="alert"
                >
                  {error}
                </div>
              )}

              {!loading && !error && tickets.length === 0 && (
                <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
                  No tickets found in the database.
                </div>
              )}

              {!loading && !error && tickets.length > 0 && (
                <div className="min-h-0 flex-1 overflow-auto rounded-md border border-slate-200 bg-white">
                  <table className="min-w-full border-separate border-spacing-0 text-sm">
                    <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_rgb(226,232,240)]">
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
              </div>
            </div>
          ) : activeTab === 'reject_reason' ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex shrink-0 justify-end border-b border-slate-200 bg-white px-4 py-2">
                <button
                  type="button"
                  onClick={loadTickets}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100"
                >
                  Refresh
                </button>
              </div>

              {rejectError && (
                <p className="shrink-0 border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-800">
                  {rejectError}
                </p>
              )}
              {rejectSuccess && (
                <p className="shrink-0 border-b border-emerald-100 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
                  {rejectSuccess}
                </p>
              )}

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-3 pt-2">
              {loading && (
                <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
                  Loading tickets...
                </div>
              )}

              {!loading && error && (
                <div
                  className="shrink-0 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                  role="alert"
                >
                  {error}
                </div>
              )}

              {!loading && !error && tickets.length === 0 && (
                <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
                  No tickets found in the database.
                </div>
              )}

              {!loading && !error && tickets.filter((t) => t.status !== 'REJECTED').length === 0 && (
                <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
                  All available tickets are already rejected.
                </div>
              )}

              {!loading && !error && tickets.filter((t) => t.status !== 'REJECTED').length > 0 && (
                <div className="min-h-0 flex-1 overflow-auto rounded-md border border-slate-200 bg-white">
                  <table className="min-w-full border-separate border-spacing-0 text-sm">
                    <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_rgb(226,232,240)]">
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
              </div>
            </div>
          ) : activeTab === 'assign_staff' ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex shrink-0 justify-end border-b border-slate-200 bg-white px-4 py-2">
                <button
                  type="button"
                  onClick={loadTickets}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100"
                >
                  Refresh
                </button>
              </div>

              {assignError && (
                <p className="shrink-0 border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-800">
                  {assignError}
                </p>
              )}
              {assignSuccess && (
                <p className="shrink-0 border-b border-emerald-100 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
                  {assignSuccess}
                </p>
              )}

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-3 pt-2">
              {loading && (
                <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
                  Loading tickets...
                </div>
              )}

              {!loading && error && (
                <div
                  className="shrink-0 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                  role="alert"
                >
                  {error}
                </div>
              )}

              {!loading && !error && tickets.length === 0 && (
                <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
                  No tickets found in the database.
                </div>
              )}

              {!loading && !error && tickets.length > 0 && (
                <div className="min-h-0 flex-1 overflow-auto rounded-md border border-slate-200 bg-white">
                  <table className="min-w-full border-separate border-spacing-0 text-sm">
                    <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_rgb(226,232,240)]">
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
              </div>
            </div>
          ) : activeTab === 'filters' ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex shrink-0 flex-wrap items-end justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2">
                <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">
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
                <button
                  type="button"
                  onClick={loadFilteredTickets}
                  className="shrink-0 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                >
                  Refresh
                </button>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-3 pt-2">
              {loading && (
                <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
                  Loading tickets...
                </div>
              )}

              {!loading && error && (
                <div
                  className="shrink-0 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                  role="alert"
                >
                  {error}
                </div>
              )}

              {!loading && !error && tickets.length === 0 && (
                <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
                  No tickets match these filters.
                </div>
              )}

              {!loading && !error && tickets.length > 0 && (
                <div className="min-h-0 flex-1 overflow-auto rounded-md border border-slate-200 bg-white">
                  <table className="min-w-full border-separate border-spacing-0 text-sm">
                    <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_rgb(226,232,240)]">
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
              </div>
            </div>
          ) : activeTab === 'comment_moderation' ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex shrink-0 justify-end border-b border-slate-200 bg-white px-4 py-2">
                <button
                  type="button"
                  onClick={loadTickets}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100"
                >
                  Refresh
                </button>
              </div>

              {loading && (
                <div className="flex flex-1 items-center justify-center p-8 text-sm text-gray-500">
                  Loading tickets...
                </div>
              )}

              {!loading && error && (
                <div
                  className="shrink-0 border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800"
                  role="alert"
                >
                  {error}
                </div>
              )}

              {!loading && !error && tickets.length === 0 && (
                <div className="flex flex-1 items-center justify-center p-8 text-sm text-gray-500">
                  No tickets in the database.
                </div>
              )}

              {!loading && !error && tickets.length > 0 && (
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 md:flex-row">
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:max-w-[50%]">
                  <div className="min-h-0 flex-1 overflow-auto rounded-md border border-slate-200 bg-white">
                    <table className="min-w-full border-separate border-spacing-0 text-sm">
                      <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_rgb(226,232,240)]">
                        <tr>
                          <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-slate-700">
                            Ticket
                          </th>
                          <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-slate-700">
                            Location
                          </th>
                          <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-slate-700">
                            Comments
                          </th>
                          <th className="border-b border-gray-200 px-3 py-2 text-right font-semibold text-slate-700">
                            Select
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {tickets.map((ticket) => {
                          const list = ticket.comments || []
                          const visible = list.filter((c) => !c.hidden).length
                          const isSel = selectedTicketId === ticket.id
                          return (
                            <tr
                              key={ticket.id}
                              className={`odd:bg-white even:bg-slate-50/60 ${isSel ? 'bg-slate-100' : ''}`}
                            >
                              <td className="max-w-[8rem] border-b border-gray-100 px-3 py-2 font-mono text-xs text-slate-600">
                                {ticket.id}
                              </td>
                              <td className="border-b border-gray-100 px-3 py-2 text-slate-700">
                                {ticket.location || '—'}
                              </td>
                              <td className="border-b border-gray-100 px-3 py-2 text-slate-700">
                                {list.length === 0
                                  ? '—'
                                  : `${visible} visible / ${list.length} total`}
                              </td>
                              <td className="border-b border-gray-100 px-3 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => setSelectedTicketId(ticket.id)}
                                  className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800"
                                >
                                  {isSel ? 'Selected' : 'Select'}
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-slate-200 bg-white p-3">
                  {!selectedTicket && (
                    <p className="m-0 flex flex-1 items-center justify-center text-center text-sm text-gray-500">
                      Select a ticket to view and moderate comments.
                    </p>
                  )}
                  {selectedTicket && (
                    <>
                      <p className="mb-2 shrink-0 font-mono text-xs text-slate-500">{selectedTicket.id}</p>
                      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                        {(selectedTicket.comments || []).length === 0 && (
                          <p className="text-sm text-gray-500">No comments yet.</p>
                        )}
                        {(selectedTicket.comments || []).map((c) => (
                          <div
                            key={c.id}
                            className={`rounded-md border px-3 py-2 text-sm ${
                              c.hidden
                                ? 'border-amber-200 bg-amber-50'
                                : 'border-gray-200 bg-slate-50'
                            }`}
                          >
                            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                              <span className="font-medium text-slate-800">{c.author || '—'}</span>
                              <time className="text-xs text-gray-500" dateTime={c.createdAt}>
                                {formatDate(c.createdAt)}
                              </time>
                            </div>
                            {c.hidden && (
                              <span className="mb-1 inline-block rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-900">
                                Hidden from users
                              </span>
                            )}
                            <p className="m-0 whitespace-pre-wrap text-slate-700">{c.body}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={commentActionId === c.id}
                                onClick={() =>
                                  handleToggleCommentHidden(selectedTicket.id, c.id, !c.hidden)
                                }
                                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                              >
                                {c.hidden ? 'Unhide' : 'Hide'}
                              </button>
                              <button
                                type="button"
                                disabled={commentActionId === c.id}
                                onClick={() => handleDeleteComment(selectedTicket.id, c.id)}
                                className="rounded border border-red-200 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 shrink-0 border-t border-gray-200 pt-3">
                        <label className="mb-1 block text-xs font-medium text-gray-600">Author label</label>
                        <input
                          type="text"
                          value={newCommentAuthor}
                          onChange={(e) => setNewCommentAuthor(e.target.value)}
                          className="mb-2 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                          placeholder="ADMIN"
                        />
                        <label className="mb-1 block text-xs font-medium text-gray-600">New comment</label>
                        <textarea
                          value={newCommentBody}
                          onChange={(e) => setNewCommentBody(e.target.value)}
                          rows={3}
                          className="mb-2 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                          placeholder="Add an internal note or reply…"
                        />
                        <button
                          type="button"
                          disabled={commentSubmitting || !newCommentBody.trim()}
                          onClick={handleAddComment}
                          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                        >
                          {commentSubmitting ? 'Adding…' : 'Add comment'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              )}
            </div>
          ) : null}
      </div>
    </div>
  )
}
