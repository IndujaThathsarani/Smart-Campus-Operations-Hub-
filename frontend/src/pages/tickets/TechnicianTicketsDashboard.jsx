import { useCallback, useEffect, useMemo, useState } from 'react'
import { Eye, ImageIcon, MessageSquareText, Pencil, Ticket, Trash2, Wrench } from 'lucide-react'
import ActionToasts from '../../components/ActionToasts'
import TicketParticlesBackground from '../../components/TicketParticlesBackground'
import TicketSlaCountdown from '../../components/TicketSlaCountdown'
import { useAuth } from '../../context/AuthContext'
import { useActionToasts } from '../../hooks/useActionToasts'
import { API_BASE_URL, apiGet, apiSend } from '../../services/apiClient'
import TicketWorkflowBar from '../../components/TicketWorkflowBar'

const STATUS_TABS = ['ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']

function formatEnum(value) {
  if (!value) return '—'
  return String(value).replaceAll('_', ' ')
}

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return String(value)
  }
}

function ticketLabel(ticket) {
  return ticket?.ticketNumber || ticket?.id || '—'
}

function displaySubject(ticket) {
  const value = ticket?.subject
  if (!value || !String(value).trim()) return 'Untitled incident'
  return String(value).trim()
}

function buildAttachmentUrl(ticketId, filename) {
  if (!ticketId || !filename) return ''
  return `${API_BASE_URL}/api/tickets/${encodeURIComponent(ticketId)}/attachments/${encodeURIComponent(filename)}`
}

function technicianAssignmentLabel(user) {
  if (!user) return ''
  const name = String(user.name || user.fullName || '').trim()
  const email = String(user.email || '').trim()
  if (name && email) return `${name} (${email})`
  return name || email
}

function isAssignedToTechnician(ticket, user) {
  const assignedTo = String(ticket?.assignedTo || '').trim().toLowerCase()
  if (!assignedTo) return false
  const label = technicianAssignmentLabel(user).toLowerCase()
  const email = String(user?.email || '').trim().toLowerCase()
  const name = String(user?.name || user?.fullName || '').trim().toLowerCase()
  return (
    assignedTo === label ||
    assignedTo === email ||
    assignedTo === name ||
    assignedTo.includes(email) ||
    assignedTo.includes(name)
  )
}

function isCommentOwner(comment, user) {
  if (!comment || !user) return false
  if (comment.ownerId && user.id) {
    return comment.ownerId === user.id
  }
  if (comment.ownerEmail && user.email) {
    return comment.ownerEmail === user.email
  }
  return false
}

export default function TechnicianTicketsDashboard() {
  const { user } = useAuth()
  const { toasts, pushToast, dismissToast } = useActionToasts()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeStatus, setActiveStatus] = useState('ASSIGNED')
  const [commentDrafts, setCommentDrafts] = useState({})
  const [commentSavingTicketId, setCommentSavingTicketId] = useState(null)
  const [commentActionId, setCommentActionId] = useState(null)
  const [editCommentId, setEditCommentId] = useState(null)
  const [editDrafts, setEditDrafts] = useState({})
  const [clockTick, setClockTick] = useState(() => Date.now())
  const [expandedTickets, setExpandedTickets] = useState({})
  const [rowActions, setRowActions] = useState({})
  const [statusDrafts, setStatusDrafts] = useState({})
  const [statusSavingTicketId, setStatusSavingTicketId] = useState(null)
  const [statusActionError, setStatusActionError] = useState(null)
  const [statusActionSuccess, setStatusActionSuccess] = useState(null)
  const [rejectDrafts, setRejectDrafts] = useState({})
  const [rejectSavingTicketId, setRejectSavingTicketId] = useState(null)
  const [rejectActionError, setRejectActionError] = useState(null)
  const [rejectActionSuccess, setRejectActionSuccess] = useState(null)

  const loadTickets = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiGet('/api/tickets')
      setTickets(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.body?.message || err?.message || 'Failed to load tickets.')
      setTickets([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockTick(Date.now())
    }, 60000)
    return () => window.clearInterval(timer)
  }, [])

  const technicianLabel = useMemo(() => technicianAssignmentLabel(user), [user])

  const assignedTickets = useMemo(
    () => tickets.filter((ticket) => isAssignedToTechnician(ticket, user)),
    [tickets, user],
  )

  const counts = useMemo(() => {
    return assignedTickets.reduce(
      (acc, ticket) => {
        const status = String(ticket.status || 'OPEN')
        acc[status] = (acc[status] || 0) + 1
        return acc
      },
      {
        assigned: assignedTickets.length,
        IN_PROGRESS: 0,
        RESOLVED: 0,
        CLOSED: 0,
      },
    )
  }, [assignedTickets])

  const filteredTickets = useMemo(
    () => {
      if (activeStatus === 'ASSIGNED') return assignedTickets
      return assignedTickets.filter((ticket) => ticket.status === activeStatus)
    },
    [activeStatus, assignedTickets],
  )

  const toggleExpandedTicket = useCallback((ticketId) => {
    setExpandedTickets((prev) => ({
      ...prev,
      [ticketId]: !prev[ticketId],
    }))
  }, [])

  const toggleRowAction = useCallback((ticketId, action) => {
    setRowActions((prev) => ({
      ...prev,
      [ticketId]: prev[ticketId] === action ? null : action,
    }))
    setExpandedTickets((prev) => ({
      ...prev,
      [ticketId]: true,
    }))
  }, [])

  const clearRowAction = useCallback((ticketId) => {
    setRowActions((prev) => {
      if (!(ticketId in prev)) return prev
      const next = { ...prev }
      delete next[ticketId]
      return next
    })
  }, [])

  const getStatusDraft = useCallback(
    (ticket) => {
      if (statusDrafts[ticket.id] !== undefined) return statusDrafts[ticket.id]
      return ticket.status || 'OPEN'
    },
    [statusDrafts],
  )

  const updateStatusDraft = useCallback((ticketId, value) => {
    setStatusDrafts((prev) => ({ ...prev, [ticketId]: value }))
  }, [])

  const updateRejectDraft = useCallback((ticketId, value) => {
    setRejectDrafts((prev) => ({ ...prev, [ticketId]: value }))
  }, [])

  const handleSaveStatus = useCallback(
    async (ticket) => {
      const status = String(getStatusDraft(ticket) || 'OPEN').trim()
      if (!status) return
      if (status === 'REJECTED') {
        pushToast({
          title: 'Use reject',
          message: 'Use the reject button for rejected tickets.',
          variant: 'warning',
        })
        return
      }

      setStatusSavingTicketId(ticket.id)
      try {
        await apiSend(`/api/tickets/${ticket.id}/status`, {
          method: 'PATCH',
          body: {
            status,
            rejectReason: null,
          },
        })
        pushToast({
          title: 'Saved',
          message: `Status updated for ${ticketLabel(ticket)}.`,
          variant: 'success',
        })
        await loadTickets()
        clearRowAction(ticket.id)
      } catch (err) {
        pushToast({
          title: 'Could not update status',
          message: err?.body?.message || err?.message || 'Could not update ticket status.',
          variant: 'error',
        })
      } finally {
        setStatusSavingTicketId(null)
      }
    },
    [clearRowAction, getStatusDraft, loadTickets, pushToast],
  )

  const handleRejectTicket = useCallback(
    async (ticket) => {
      const reason = String(rejectDrafts[ticket.id] || '').trim()
      if (!reason) {
        pushToast({
          title: 'Reason needed',
          message: 'Please provide a reject reason first.',
          variant: 'warning',
        })
        return
      }

      setRejectSavingTicketId(ticket.id)
      try {
        await apiSend(`/api/tickets/${ticket.id}/status`, {
          method: 'PATCH',
          body: {
            status: 'REJECTED',
            rejectReason: reason,
          },
        })
        pushToast({
          title: 'Rejected',
          message: `Ticket ${ticketLabel(ticket)} rejected.`,
          variant: 'success',
        })
        setRejectDrafts((prev) => ({ ...prev, [ticket.id]: '' }))
        await loadTickets()
        clearRowAction(ticket.id)
      } catch (err) {
        pushToast({
          title: 'Could not reject ticket',
          message: err?.body?.message || err?.message || 'Could not reject ticket.',
          variant: 'error',
        })
      } finally {
        setRejectSavingTicketId(null)
      }
    },
    [clearRowAction, loadTickets, pushToast, rejectDrafts],
  )

  const updateCommentDraft = useCallback((ticketId, value) => {
    setCommentDrafts((prev) => ({ ...prev, [ticketId]: value }))
  }, [])

  const startEditingComment = useCallback((comment) => {
    setEditCommentId(comment.id)
    setEditDrafts((prev) => ({ ...prev, [comment.id]: comment.body || '' }))
  }, [])

  const cancelEditingComment = useCallback(() => {
    setEditCommentId(null)
  }, [])

  const updateEditDraft = useCallback((commentId, value) => {
    setEditDrafts((prev) => ({ ...prev, [commentId]: value }))
  }, [])

  const handleAddComment = useCallback(
    async (ticketId) => {
      const body = (commentDrafts[ticketId] || '').trim()
      if (!body) return

      setCommentSavingTicketId(ticketId)
      try {
        await apiSend(`/api/tickets/${ticketId}/comments`, {
          method: 'POST',
          body: { body },
        })
        setCommentDrafts((prev) => ({ ...prev, [ticketId]: '' }))
        await loadTickets()
        pushToast({
          title: 'Comment added',
          message: 'Your comment was posted successfully.',
          variant: 'success',
        })
      } catch (err) {
        pushToast({
          title: 'Could not add comment',
          message: err?.body?.message || err?.message || 'Could not add comment.',
          variant: 'error',
        })
      } finally {
        setCommentSavingTicketId(null)
      }
    },
    [commentDrafts, loadTickets, pushToast],
  )

  const handleSaveCommentEdit = useCallback(
    async (ticketId, commentId) => {
      const body = (editDrafts[commentId] || '').trim()
      if (!body) return

      setCommentActionId(commentId)
      try {
        await apiSend(`/api/tickets/${ticketId}/comments/${commentId}/body`, {
          method: 'PATCH',
          body: { body },
        })
        setEditCommentId(null)
        await loadTickets()
        pushToast({
          title: 'Comment saved',
          message: 'Your comment changes were saved.',
          variant: 'success',
        })
      } catch (err) {
        pushToast({
          title: 'Could not save comment',
          message: err?.body?.message || err?.message || 'Could not update comment.',
          variant: 'error',
        })
      } finally {
        setCommentActionId(null)
      }
    },
    [editDrafts, loadTickets, pushToast],
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
        if (editCommentId === commentId) {
          setEditCommentId(null)
        }
        await loadTickets()
        pushToast({
          title: 'Comment deleted',
          message: 'The comment was removed successfully.',
          variant: 'success',
        })
      } catch (err) {
        pushToast({
          title: 'Could not delete comment',
          message: err?.body?.message || err?.message || 'Could not delete comment.',
          variant: 'error',
        })
      } finally {
        setCommentActionId(null)
      }
    },
    [editCommentId, loadTickets, pushToast],
  )

  return (
    <section className="relative isolate w-full max-w-none overflow-hidden">
      <TicketParticlesBackground />
      <div className="relative z-10">
        <ActionToasts toasts={toasts} onDismiss={dismissToast} />
        <header className="mb-5 flex flex-col gap-3">
          <div className="min-w-0 flex-1 sm:pr-4">
            <p className="mb-1.5 text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
              Technician dashboard
            </p>
            <h1 className="inline-flex items-center gap-2 text-3xl font-semibold text-slate-900">
              <Wrench className="h-7 w-7 text-sky-700" strokeWidth={2.2} />
              Maintenance ticket overview
            </h1>
          </div>
        </header>

        <div className="space-y-4">
          <div className="mx-auto grid w-full max-w-6xl gap-4 md:grid-cols-2 xl:grid-cols-4">
          {STATUS_TABS.map((status) => {
            const isActive = activeStatus === status
            const label = status === 'ASSIGNED' ? 'Assigned tickets' : formatEnum(status)
            const value =
              status === 'ASSIGNED'
                ? counts.assigned
                : counts[status] || 0

            return (
              <button
                key={status}
                type="button"
                onClick={() => setActiveStatus(status)}
                  className={`w-full rounded-lg border px-4 py-2.5 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                    isActive
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                      : 'border-gray-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50'
                  }`}
              >
                <p
                  className={`text-xs font-medium uppercase tracking-[0.16em] ${
                    isActive ? 'text-slate-200' : 'text-slate-500'
                  }`}
                >
                  {label}
                </p>
                <p className={`mt-1.5 text-2xl font-semibold leading-none ${isActive ? 'text-white' : ''}`}>
                  {value}
                </p>
              </button>
            )
          })}
        </div>

          <div className="rounded-md border border-slate-200/70 bg-white/40 p-5 shadow-sm backdrop-blur-[1px] transition duration-200 hover:border-sky-200 hover:bg-white/45 hover:shadow-lg">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Work queue</h2>
                <p className="mt-1 text-base text-slate-500">
                  {activeStatus === 'ASSIGNED'
                    ? `Tickets assigned to ${technicianLabel || 'you'}`
                    : `Tickets currently in ${formatEnum(activeStatus).toLowerCase()} state.`}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold uppercase tracking-wide text-slate-700">
                {filteredTickets.length} items
              </span>
            </div>

            {loading && (
              <div className="mt-6 rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
                Loading tickets…
              </div>
            )}

            {!loading && error && (
              <div className="mt-6 rounded-md border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-900">
                <p>{error}</p>
              </div>
            )}

            {!loading && !error && filteredTickets.length === 0 && (
              <div className="mt-6 rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
                No assigned tickets match this status. Try another view or refresh the list.
              </div>
            )}

            {!loading && !error && filteredTickets.length > 0 && (
              <ul className="mt-6 m-0 flex list-none flex-col gap-3 p-0">
                {filteredTickets.map((ticket, index) => {
                  const visibleComments = (ticket.comments || []).filter((comment) => !comment.hidden)
                  const commentDraft = commentDrafts[ticket.id] || ''
                  const isCommentSaving = commentSavingTicketId === ticket.id
                  const isExpanded = Boolean(expandedTickets[ticket.id])
                  const rowAction = rowActions[ticket.id] || null
                  const attachmentFiles = Array.isArray(ticket.attachmentFileNames)
                    ? ticket.attachmentFileNames.filter(Boolean)
                    : []

                  return (
                    <li
                      key={ticket.id}
                      className="ticket-enter relative mx-auto w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_14px_30px_rgba(15,23,42,0.12)] lg:w-[62%]"
                      style={{ animationDelay: `${index * 80}ms` }}
                    >
                      <TicketSlaCountdown
                        priority={ticket.priority}
                        createdAt={ticket.createdAt}
                        resolvedAt={ticket.resolvedAt}
                        status={ticket.status}
                        now={clockTick}
                        size={80}
                        className="absolute right-5 top-1/2 z-10 -translate-y-1/2"
                      />
                      <div className="flex items-center gap-4">
                        <div className="flex shrink-0 items-center justify-center py-2">
                          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 text-sky-700 shadow-sm">
                            <Ticket className="h-8 w-8" strokeWidth={2.2} />
                          </span>
                        </div>

                        <div className="min-w-0 flex-1 pr-28">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <span className="block break-all font-mono text-sm font-medium text-slate-700" title={ticket.id}>
                                {ticketLabel(ticket)}
                              </span>
                              <p className="mt-2 text-lg font-semibold text-slate-900">{displaySubject(ticket)}</p>
                              <p className="mt-1 text-sm text-slate-500">{ticket.location || '—'}</p>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleExpandedTicket(ticket.id)}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800 transition duration-200 hover:-translate-y-0.5 hover:border-slate-900 hover:bg-slate-950 hover:text-white hover:shadow-sm"
                                >
                                  <Eye className="h-4 w-4" strokeWidth={2.2} />
                                  {isExpanded ? 'Hide details' : 'View all'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleRowAction(ticket.id, 'status')}
                                  className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-semibold transition duration-200 hover:-translate-y-0.5 hover:shadow-sm ${
                                    rowAction === 'status'
                                      ? 'border-slate-900 bg-slate-900 text-white'
                                      : 'border-sky-200 bg-sky-50 text-sky-800 hover:border-sky-300 hover:bg-sky-100'
                                  }`}
                                >
                                  Update
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleRowAction(ticket.id, 'reject')}
                                  className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-semibold transition duration-200 hover:-translate-y-0.5 hover:shadow-sm ${
                                    rowAction === 'reject'
                                      ? 'border-slate-900 bg-slate-900 text-white'
                                      : 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100'
                                  }`}
                                >
                                  Reject
                                </button>
                              </div>
                            </div>

                            <div className="flex shrink-0 flex-col items-end gap-2 self-start">
                              <div className="max-w-full">
                                <TicketWorkflowBar status={ticket.status} rejectReason={ticket.rejectReason} compact />
                              </div>
                              <p className="text-right text-sm text-gray-600">
                                <time dateTime={ticket.createdAt}>{formatDate(ticket.createdAt)}</time>
                              </p>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="mt-3 border-t border-slate-200 pt-3">
                              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
                                <div className="min-w-0">
                                  <p className="text-base text-slate-600">
                                    <span>{formatEnum(ticket.category)}</span>
                                    <span className="mx-2 text-slate-300">·</span>
                                    <span>{ticket.assignedTo || 'Unassigned'}</span>
                                  </p>
                                  <p className="mt-2 text-base leading-7 text-slate-800">
                                    {ticket.description || 'No description provided.'}
                                  </p>

                                  <div className="mt-3">
                                    <TicketWorkflowBar status={ticket.status} rejectReason={ticket.rejectReason} />
                                  </div>

                                  {rowAction === 'status' && (
                                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                      <label className="mb-1 block text-xs font-medium text-slate-600">
                                        Change status
                                      </label>
                                      <div className="flex flex-wrap items-end gap-2">
                                        <select
                                          value={getStatusDraft(ticket)}
                                          onChange={(e) => updateStatusDraft(ticket.id, e.target.value)}
                                          disabled={statusSavingTicketId === ticket.id}
                                          className="min-w-[12rem] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                        >
                                          {STATUS_OPTIONS.map((status) => (
                                            <option key={status} value={status}>
                                              {formatEnum(status)}
                                            </option>
                                          ))}
                                        </select>
                                        <button
                                          type="button"
                                          onClick={() => handleSaveStatus(ticket)}
                                          disabled={statusSavingTicketId === ticket.id}
                                          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-slate-800 disabled:opacity-50"
                                        >
                                          {statusSavingTicketId === ticket.id ? 'Saving...' : 'Save status'}
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {rowAction === 'reject' && (
                                    <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3">
                                      <label className="mb-1 block text-xs font-medium text-rose-700">
                                        Reject reason
                                      </label>
                                      <textarea
                                        value={rejectDrafts[ticket.id] || ''}
                                        onChange={(e) => updateRejectDraft(ticket.id, e.target.value)}
                                        rows={3}
                                        className="mb-2 w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
                                        placeholder="Why is this ticket being rejected?"
                                        disabled={rejectSavingTicketId === ticket.id}
                                      />
                                      <div className="flex flex-wrap items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => handleRejectTicket(ticket)}
                                          disabled={rejectSavingTicketId === ticket.id}
                                          className="rounded-lg bg-rose-700 px-3 py-2 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-rose-800 disabled:opacity-50"
                                        >
                                          {rejectSavingTicketId === ticket.id ? 'Submitting...' : 'Submit reject'}
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {attachmentFiles.length > 0 && (
                                    <div className="mt-4">
                                      <div className="mb-2 flex items-center justify-between gap-3">
                                        <p className="m-0 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                                          <ImageIcon className="h-4 w-4 text-slate-500" strokeWidth={2.2} />
                                          Evidence images
                                        </p>
                                        <span className="text-xs text-slate-500">
                                          {attachmentFiles.length} {attachmentFiles.length === 1 ? 'image' : 'images'}
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                                        {attachmentFiles.map((filename, attachmentIndex) => {
                                          const src = buildAttachmentUrl(ticket.id, filename)
                                          return (
                                            <a
                                              key={`${ticket.id}-${filename}-${attachmentIndex}`}
                                              href={src}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-50 transition duration-200 hover:-translate-y-0.5 hover:border-slate-900 hover:shadow-md"
                                              title={filename}
                                            >
                                              <img
                                                src={src}
                                                alt={`Attachment ${attachmentIndex + 1}`}
                                                className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
                                                loading="lazy"
                                              />
                                            </a>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-white p-3">
                                  <div className="mb-3 flex items-center justify-between gap-3">
                                    <p className="m-0 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                                      <MessageSquareText className="h-4 w-4 text-slate-500" strokeWidth={2.2} />
                                      Comments
                                    </p>
                                    <span className="text-xs text-slate-500">
                                      {visibleComments.length} {visibleComments.length === 1 ? 'comment' : 'comments'}
                                    </span>
                                  </div>

                                  {visibleComments.length === 0 ? (
                                    <p className="mb-3 text-sm text-slate-500">No comments yet.</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {visibleComments.map((comment) => {
                                        const owner = isCommentOwner(comment, user)
                                        const isEditing = editCommentId === comment.id
                                        const editDraft = editDrafts[comment.id] ?? comment.body ?? ''
                                        const isBusy = commentActionId === comment.id

                                        return (
                                          <div
                                            key={comment.id}
                                            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 transition duration-200 hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-sm"
                                          >
                                            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                                              <div className="min-w-0">
                                                <span className="text-sm font-medium text-slate-800">
                                                  {comment.author || 'Unknown user'}
                                                </span>
                                                {owner && (
                                                  <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700">
                                                    You
                                                  </span>
                                                )}
                                              </div>
                                              <time
                                                className="text-xs text-slate-500"
                                                dateTime={comment.updatedAt || comment.createdAt}
                                              >
                                                {formatDate(comment.updatedAt || comment.createdAt)}
                                              </time>
                                            </div>

                                            {isEditing ? (
                                              <>
                                                <textarea
                                                  value={editDraft}
                                                  onChange={(e) => updateEditDraft(comment.id, e.target.value)}
                                                  rows={3}
                                                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                                />
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                  <button
                                                    type="button"
                                                    disabled={isBusy || !editDraft.trim()}
                                                    onClick={() => handleSaveCommentEdit(ticket.id, comment.id)}
                                                    className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-slate-800 disabled:opacity-50"
                                                  >
                                                    {isBusy ? 'Saving...' : 'Save'}
                                                  </button>
                                                  <button
                                                    type="button"
                                                    disabled={isBusy}
                                                    onClick={cancelEditingComment}
                                                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:bg-slate-100 disabled:opacity-50"
                                                  >
                                                    Cancel
                                                  </button>
                                                </div>
                                              </>
                                            ) : (
                                              <>
                                                <p className="m-0 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                                  {comment.body}
                                                </p>
                                                {owner && (
                                                  <div className="mt-2 flex flex-wrap gap-2">
                                                    <button
                                                      type="button"
                                                      disabled={isBusy}
                                                      onClick={() => startEditingComment(comment)}
                                                      className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:bg-slate-100 disabled:opacity-50"
                                                    >
                                                      <Pencil className="h-3.5 w-3.5" strokeWidth={2.2} />
                                                      Edit
                                                    </button>
                                                    <button
                                                      type="button"
                                                      disabled={isBusy}
                                                      onClick={() => handleDeleteComment(ticket.id, comment.id)}
                                                      className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 transition duration-200 hover:-translate-y-0.5 hover:bg-red-50 disabled:opacity-50"
                                                    >
                                                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                                                      Delete
                                                    </button>
                                                  </div>
                                                )}
                                              </>
                                            )}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}

                                  <div className="mt-3">
                                    <textarea
                                      value={commentDraft}
                                      onChange={(e) => updateCommentDraft(ticket.id, e.target.value)}
                                      rows={3}
                                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                      placeholder="Add a comment to this ticket..."
                                    />
                                    <div className="mt-2 flex justify-end">
                                      <button
                                        type="button"
                                        disabled={isCommentSaving || !commentDraft.trim()}
                                        onClick={() => handleAddComment(ticket.id)}
                                        className="inline-flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-sky-500 hover:shadow-md disabled:opacity-50"
                                      >
                                        <MessageSquareText className="h-3.5 w-3.5" strokeWidth={2.2} />
                                        {isCommentSaving ? 'Adding...' : 'Add comment'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
