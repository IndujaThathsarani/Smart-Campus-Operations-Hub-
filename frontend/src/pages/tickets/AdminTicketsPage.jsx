import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FaBan,
  FaEye,
  FaFloppyDisk,
  FaPaperPlane,
  FaPenToSquare,
  FaRegTrashCan,
  FaUserPen,
} from 'react-icons/fa6'
import TicketWorkflowBar from '../../components/TicketWorkflowBar'
import TicketSlaBadges from '../../components/TicketSlaBadges'
import { TICKET_CATEGORIES, TICKET_PRIORITIES } from '../../constants/ticketOptions'
import { useAuth } from '../../context/AuthContext'
import { API_BASE_URL, apiDelete, apiGet, apiSend } from '../../services/apiClient'

const ADMIN_TABS = [
  { id: 'view_all', label: 'View all tickets' },
  { id: 'change_status', label: 'Change ticket status' },
  { id: 'reject_reason', label: 'Reject with reason' },
  { id: 'assign_staff', label: 'Assign technician/staff' },
  { id: 'filters', label: 'Filters' },
  { id: 'comment_moderation', label: 'Comment moderation' },
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

function statusClasses(status) {
  switch ((status || '').toUpperCase()) {
    case 'OPEN':
      return 'bg-blue-100 text-blue-800'
    case 'IN_PROGRESS':
      return 'bg-amber-100 text-amber-800'
    case 'RESOLVED':
      return 'bg-emerald-100 text-emerald-800'
    case 'CLOSED':
      return 'bg-slate-200 text-slate-800'
    case 'REJECTED':
      return 'bg-rose-100 text-rose-800'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

function StatusPill({ status }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${statusClasses(status)}`}
    >
      {formatEnum(status)}
    </span>
  )
}

function displayTicketId(ticket) {
  return ticket?.ticketNumber || ticket?.id || '—'
}

function displaySubject(ticket) {
  const value = ticket?.subject
  if (!value || !String(value).trim()) return 'Untitled incident'
  return String(value).trim()
}

function formatCategory(value) {
  if (!value) return '—'
  return String(value).replaceAll('_', ' ')
}

function buildAttachmentUrl(ticketId, filename) {
  if (!ticketId || !filename) return ''
  return `${API_BASE_URL}/api/tickets/${encodeURIComponent(ticketId)}/attachments/${encodeURIComponent(filename)}`
}

function ticketStateKey(ticket) {
  return ticket?.id || ticket?.ticketNumber || ''
}

function isPendingStatus(ticket) {
  return ticket?.status === 'IN_PROGRESS'
}

function matchesAdminViewFilter(ticket, filterKey) {
  if (filterKey === 'all') return true
  if (filterKey === 'pending') return ticket?.status === 'IN_PROGRESS'
  return ticket?.status === String(filterKey).toUpperCase()
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

export default function AdminTicketsPage() {
  const { user } = useAuth()
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
  const [technicians, setTechnicians] = useState([])
  const [techniciansLoading, setTechniciansLoading] = useState(false)
  const [techniciansError, setTechniciansError] = useState(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [adminViewFilter, setAdminViewFilter] = useState('all')
  const [deletingId, setDeletingId] = useState(null)
  const [expandedTickets, setExpandedTickets] = useState({})
  const [inlineCardActions, setInlineCardActions] = useState({})
  const [selectedTicketId, setSelectedTicketId] = useState(null)
  const [newCommentBody, setNewCommentBody] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [commentActionId, setCommentActionId] = useState(null)
  const [clockTick, setClockTick] = useState(() => Date.now())

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

  const loadTechnicians = useCallback(async () => {
    setTechniciansLoading(true)
    setTechniciansError(null)
    try {
      const data = await apiGet('/api/tickets/technicians')
      setTechnicians(Array.isArray(data) ? data : [])
    } catch (e) {
      setTechnicians([])
      setTechniciansError(e?.body?.message || e?.message || 'Could not load technicians.')
    } finally {
      setTechniciansLoading(false)
    }
  }, [])

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

  useEffect(() => {
    if (activeTab === 'assign_staff' || activeTab === 'view_all') {
      loadTechnicians()
    }
  }, [activeTab, loadTechnicians])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockTick(Date.now())
    }, 60000)
    return () => window.clearInterval(timer)
  }, [])

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

  const toggleInlineCardAction = useCallback((ticketKey, action) => {
    setInlineCardActions((prev) => {
      const nextAction = prev[ticketKey] === action ? null : action
      return {
        ...prev,
        [ticketKey]: nextAction,
      }
    })
  }, [])

  const clearInlineCardAction = useCallback((ticketKey) => {
    setInlineCardActions((prev) => {
      if (!(ticketKey in prev)) return prev
      const next = { ...prev }
      delete next[ticketKey]
      return next
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
        setStatusActionSuccess(`Status updated for ticket ${displayTicketId(ticket)}.`)
        await refreshTickets()
        clearInlineCardAction(ticketStateKey(ticket))
      } catch (e) {
        setStatusActionError(e?.body?.message || e?.message || 'Could not update ticket status.')
      } finally {
        setSavingId(null)
      }
    },
    [clearInlineCardAction, getDraft, refreshTickets],
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
        setRejectSuccess(`Ticket ${displayTicketId(ticket)} rejected successfully.`)
        setRejectDrafts((prev) => ({ ...prev, [ticket.id]: '' }))
        await refreshTickets()
        clearInlineCardAction(ticketStateKey(ticket))
      } catch (e) {
        setRejectError(e?.body?.message || e?.message || 'Could not reject ticket.')
      } finally {
        setRejectSavingId(null)
      }
    },
    [clearInlineCardAction, refreshTickets, rejectDrafts],
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

  const refreshAssignmentData = useCallback(() => {
    loadTickets()
    loadTechnicians()
  }, [loadTechnicians, loadTickets])

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
        setAssignSuccess(`Assignment updated for ticket ${displayTicketId(ticket)}.`)
        setAssignDrafts((prev) => ({ ...prev, [ticket.id]: value }))
        await refreshTickets()
        clearInlineCardAction(ticketStateKey(ticket))
      } catch (e) {
        setAssignError(e?.body?.message || e?.message || 'Could not save assignment.')
      } finally {
        setAssignSavingId(null)
      }
    },
    [clearInlineCardAction, getAssignDraft, refreshTickets],
  )

  const handleDeleteTicket = useCallback(
    async (ticket) => {
      const ok = window.confirm(
        `Delete ticket ${displayTicketId(ticket)} permanently? This cannot be undone.`,
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
        setStatusActionSuccess(`Ticket ${displayTicketId(ticket)} deleted.`)
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

  const viewAllCards = useMemo(() => {
    const counts = {
      all: tickets.length,
      open: tickets.filter((ticket) => ticket.status === 'OPEN').length,
      pending: tickets.filter((ticket) => isPendingStatus(ticket)).length,
      resolved: tickets.filter((ticket) => ticket.status === 'RESOLVED').length,
      closed: tickets.filter((ticket) => ticket.status === 'CLOSED').length,
      rejected: tickets.filter((ticket) => ticket.status === 'REJECTED').length,
    }

    return [
      { key: 'all', label: 'All tickets', value: counts.all, tone: 'dark' },
      { key: 'open', label: 'Open', value: counts.open, tone: 'light' },
      { key: 'pending', label: 'Pending', value: counts.pending, tone: 'light' },
      { key: 'resolved', label: 'Resolved', value: counts.resolved, tone: 'light' },
      { key: 'closed', label: 'Closed', value: counts.closed, tone: 'light' },
      { key: 'rejected', label: 'Rejected', value: counts.rejected, tone: 'light' },
    ]
  }, [tickets])

  const visibleAdminTickets = useMemo(
    () => tickets.filter((ticket) => matchesAdminViewFilter(ticket, adminViewFilter)),
    [adminViewFilter, tickets],
  )

  const toggleExpandedTicket = useCallback((ticketId) => {
    setExpandedTickets((prev) => ({
      ...prev,
      [ticketId]: !prev[ticketId],
    }))
  }, [])

  const handleAddComment = useCallback(async () => {
    if (!selectedTicketId || !newCommentBody.trim()) return
    setCommentSubmitting(true)
    try {
      await apiSend(`/api/tickets/${selectedTicketId}/comments`, {
        method: 'POST',
        body: { body: newCommentBody.trim() },
      })
      setNewCommentBody('')
      await refreshTickets()
    } catch (e) {
      setError(e?.body?.message || e?.message || 'Could not add comment.')
    } finally {
      setCommentSubmitting(false)
    }
  }, [newCommentBody, refreshTickets, selectedTicketId])

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
    <div className="flex min-h-[calc(100vh-4rem)] w-full flex-1 flex-col overflow-hidden bg-slate-100 text-slate-900">
      <aside className="hidden">
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
                className={`w-full shrink-0 rounded-md px-3 py-2.5 text-center text-base font-semibold transition md:flex md:min-h-0 md:flex-1 md:items-center md:justify-center md:py-0 md:leading-snug ${
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

      <div className="flex min-h-[calc(100vh-4rem)] min-w-0 flex-1 flex-col overflow-hidden bg-slate-100">
          {activeTab === 'view_all' ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-100">
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

              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto bg-slate-100 px-3 pb-4 pt-3">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
                  {viewAllCards.map((card) => (
                    <button
                      key={card.key}
                      type="button"
                      onClick={() => setAdminViewFilter(card.key)}
                      className={`rounded-md border px-4 py-3 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                        adminViewFilter === card.key
                          ? 'border-slate-900 bg-slate-900 text-white ring-2 ring-slate-900/20'
                          : 'border-slate-200 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <p
                        className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
                          adminViewFilter === card.key
                            ? 'text-white/80'
                            : 'text-slate-500'
                        }`}
                      >
                        {card.label}
                      </p>
                      <p className={`mt-1 text-3xl font-semibold leading-none ${adminViewFilter === card.key ? 'text-white' : ''}`}>
                        {card.value}
                      </p>
                    </button>
                  ))}
                </div>

                {loading && (
                  <div className="rounded-md border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
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
                  <div className="rounded-md border border-dashed border-slate-300 bg-white px-5 py-8 text-center text-sm text-slate-500">
                    No tickets found in the database.
                  </div>
                )}

                {!loading && !error && tickets.length > 0 && (
                  <ul className="m-0 flex list-none flex-col gap-3 p-0">
                    {visibleAdminTickets.map((ticket, index) => {
                      const ticketKey = ticketStateKey(ticket)
                      const isExpanded = Boolean(expandedTickets[ticketKey])
                      const cardAction = inlineCardActions[ticketKey] || null
                      const ticketComments = (ticket.comments || []).filter((comment) => !comment.hidden)
                      const attachmentFiles = Array.isArray(ticket.attachmentFileNames)
                        ? ticket.attachmentFileNames.filter(Boolean)
                        : []

                      return (
                        <li
                          key={ticketKey}
                          className="ticket-enter mx-auto w-full rounded-md border border-gray-200 bg-white px-4 py-3 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-900 hover:bg-slate-950/5 hover:shadow-[0_14px_30px_rgba(15,23,42,0.12)] lg:w-[70%]"
                          style={{ animationDelay: `${index * 80}ms` }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <span
                                className="block break-all font-mono text-base font-medium text-slate-700"
                                title={ticket.id}
                              >
                                {displayTicketId(ticket)}
                              </span>
                              <p className="mt-2 text-lg font-semibold text-slate-900">{displaySubject(ticket)}</p>
                              <div className="mt-2 flex justify-start">
                                <button
                                  type="button"
                                  onClick={() => toggleExpandedTicket(ticketKey)}
                                  className="inline-flex items-center gap-1.5 rounded-md border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800 transition duration-200 hover:-translate-y-0.5 hover:border-slate-900 hover:bg-slate-950 hover:text-white hover:shadow-sm"
                                >
                                  <FaEye className="text-[0.9em]" />
                                  {isExpanded ? 'Hide details' : 'View all'}
                                </button>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleInlineCardAction(ticketKey, 'status')}
                                  className="inline-flex items-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 transition duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-100"
                                >
                                  <FaPenToSquare className="text-[0.9em]" />
                                  Update
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleInlineCardAction(ticketKey, 'reject')}
                                  className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition duration-200 hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-100"
                                >
                                  <FaBan className="text-[0.9em]" />
                                  Reject
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleInlineCardAction(ticketKey, 'assign')}
                                  className="inline-flex items-center gap-1.5 rounded-md border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-100"
                                >
                                  <FaUserPen className="text-[0.9em]" />
                                  Assign
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTicket(ticket)}
                                  disabled={deletingId === ticket.id}
                                  className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition duration-200 hover:-translate-y-0.5 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <FaRegTrashCan className="text-[0.9em]" />
                                  {deletingId === ticket.id ? 'Deleting...' : 'Delete'}
                                </button>
                              </div>

                              {cardAction === 'status' && (
                                <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                                  <label className="mb-1 block text-xs font-medium text-slate-600">
                                    Change status
                                  </label>
                                  <div className="flex flex-wrap items-end gap-2">
                                    <select
                                      value={getDraft(ticket).status}
                                      onChange={(e) => updateDraft(ticket.id, { status: e.target.value })}
                                      disabled={savingId === ticket.id || deletingId === ticket.id}
                                      className="min-w-[12rem] flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                    >
                                      {STATUS_OPTIONS.map((status) => (
                                        <option key={status} value={status}>
                                          {formatEnum(status)}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateStatus(ticket)}
                                      disabled={savingId === ticket.id || deletingId === ticket.id}
                                      className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      <FaFloppyDisk className="text-[0.9em]" />
                                      {savingId === ticket.id ? 'Saving...' : 'Save status'}
                                    </button>
                                  </div>
                                </div>
                              )}

                              {cardAction === 'reject' && (
                                <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3">
                                  <label className="mb-1 block text-xs font-medium text-rose-700">
                                    Reject reason
                                  </label>
                                  <textarea
                                    value={rejectDrafts[ticket.id] || ''}
                                    onChange={(e) => updateRejectDraft(ticket.id, e.target.value)}
                                    rows={3}
                                    placeholder="Why is this ticket being rejected?"
                                    disabled={rejectSavingId === ticket.id || deletingId === ticket.id}
                                    className="mb-2 w-full rounded-md border border-rose-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100 disabled:bg-slate-100"
                                  />
                                  <div className="flex flex-wrap items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleRejectWithReason(ticket)}
                                      disabled={rejectSavingId === ticket.id || deletingId === ticket.id}
                                      className="inline-flex items-center gap-1.5 rounded-md bg-rose-700 px-3 py-2 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      <FaPaperPlane className="text-[0.9em]" />
                                      {rejectSavingId === ticket.id ? 'Submitting...' : 'Submit reject'}
                                    </button>
                                  </div>
                                </div>
                              )}

                              {cardAction === 'assign' && (
                                <div className="mt-3 rounded-md border border-cyan-200 bg-cyan-50 p-3">
                                  <label className="mb-1 block text-xs font-medium text-cyan-800">
                                    Assign technician
                                  </label>
                                  <div className="flex flex-wrap items-end gap-2">
                                    <select
                                      value={getAssignDraft(ticket)}
                                      onChange={(e) => updateAssignDraft(ticket.id, e.target.value)}
                                      disabled={assignSavingId === ticket.id || deletingId === ticket.id || techniciansLoading}
                                      className="min-w-[14rem] flex-1 rounded-md border border-cyan-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-100 disabled:bg-slate-100"
                                    >
                                      <option value="">
                                        {techniciansLoading ? 'Loading technicians...' : 'Unassigned'}
                                      </option>
                                      {getAssignDraft(ticket) &&
                                        !technicians.some((technician) => technician.label === getAssignDraft(ticket)) && (
                                          <option value={getAssignDraft(ticket)}>{getAssignDraft(ticket)}</option>
                                        )}
                                      {technicians.map((technician) => (
                                        <option key={technician.id} value={technician.label}>
                                          {technician.label}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveAssignment(ticket)}
                                      disabled={assignSavingId === ticket.id || deletingId === ticket.id || techniciansLoading}
                                      className="inline-flex items-center gap-1.5 rounded-md bg-cyan-700 px-3 py-2 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      <FaUserPen className="text-[0.9em]" />
                                      {assignSavingId === ticket.id ? 'Saving...' : 'Assign'}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex shrink-0 flex-col items-end gap-2">
                              <div className="max-w-full">
                                <TicketWorkflowBar
                                  status={ticket.status}
                                  rejectReason={ticket.rejectReason}
                                  compact
                                />
                              </div>
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                <StatusPill status={ticket.status} />
                                <span
                                  className={`rounded-full px-2.5 py-1 text-sm font-semibold uppercase ${priorityClasses(ticket.priority)}`}
                                >
                                  {ticket.priority || '—'}
                                </span>
                              </div>
                              <p className="text-right text-sm text-gray-600">
                                <time dateTime={ticket.createdAt}>{formatDate(ticket.createdAt)}</time>
                              </p>
                              <TicketSlaBadges
                                priority={ticket.priority}
                                createdAt={ticket.createdAt}
                                firstResponseAt={ticket.firstResponseAt}
                                resolvedAt={ticket.resolvedAt}
                                status={ticket.status}
                                now={clockTick}
                                className="justify-end"
                              />
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="mt-3 border-t border-slate-200 pt-3">
                              <p className="text-base text-gray-600">
                                <span>{formatCategory(ticket.category)}</span>
                                <span className="mx-2 text-gray-300">·</span>
                                <span>{ticket.location || '—'}</span>
                              </p>
                              <p className="mt-2 text-base leading-7 text-gray-800">
                                {ticket.description || 'No description provided.'}
                              </p>

                              {attachmentFiles.length > 0 && (
                                <div className="mt-3">
                                  <div className="mb-2 flex items-center justify-between gap-3">
                                    <p className="m-0 text-sm font-semibold text-slate-900">Evidence images</p>
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
                                          className="group relative aspect-square overflow-hidden rounded-md border border-slate-200 bg-slate-50 transition duration-200 hover:-translate-y-0.5 hover:border-slate-900 hover:shadow-md"
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

                              {ticket.assignedTo && (
                                <p className="mt-2 text-sm text-gray-600">
                                  <span className="font-medium text-slate-700">Assigned to:</span> {ticket.assignedTo}
                                </p>
                              )}

                              {ticketComments.length > 0 && (
                                <p className="mt-2 text-sm text-slate-500">
                                  {ticketComments.length} visible {ticketComments.length === 1 ? 'comment' : 'comments'}
                                </p>
                              )}
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>
          ) : activeTab === 'change_status' ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-100">
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

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-100 px-3 pb-3 pt-2">
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
                <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
                  <table className="min-w-full border-separate border-spacing-0 text-base">
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
                          <tr key={ticket.id} className="odd:bg-white even:bg-slate-50/60 transition-all duration-200 hover:relative hover:z-[1] hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(15,23,42,0.14)]">
                            <td className="border-b border-gray-100 px-3 py-2 font-mono text-sm text-slate-600">
                              {displayTicketId(ticket)}
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
                                  className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
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
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-100">
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

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-100 px-3 pb-3 pt-2">
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
                <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
                  <table className="min-w-full border-separate border-spacing-0 text-base">
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
                            <tr key={ticket.id} className="odd:bg-white even:bg-slate-50/60 transition-all duration-200 hover:relative hover:z-[1] hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(15,23,42,0.14)]">
                              <td className="border-b border-gray-100 px-3 py-2 font-mono text-sm text-slate-600">
                                {displayTicketId(ticket)}
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
              {techniciansError && (
                <p className="shrink-0 border-b border-amber-100 bg-amber-50 px-4 py-2 text-sm text-amber-800">
                  {techniciansError}
                </p>
              )}

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#11192b] px-3 pb-3 pt-2">
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
                <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
                  <table className="min-w-full border-separate border-spacing-0 text-base">
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
                          <tr key={ticket.id} className="odd:bg-white even:bg-slate-50/60 transition-all duration-200 hover:relative hover:z-[1] hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(15,23,42,0.14)]">
                            <td className="border-b border-gray-100 px-3 py-2 font-mono text-sm text-slate-600">
                              {displayTicketId(ticket)}
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
                              <select
                                value={draft}
                                onChange={(e) => updateAssignDraft(ticket.id, e.target.value)}
                                disabled={
                                  isSaving ||
                                  deletingId === ticket.id ||
                                  techniciansLoading
                                }
                                className="w-full min-w-[12rem] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-gray-100"
                              >
                                <option value="">
                                  {techniciansLoading ? 'Loading technicians...' : 'Unassigned'}
                                </option>
                                {draft &&
                                  !technicians.some((technician) => technician.label === draft) && (
                                    <option value={draft}>{draft}</option>
                                  )}
                                {technicians.map((technician) => (
                                  <option key={technician.id} value={technician.label}>
                                    {technician.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="border-b border-gray-100 px-3 py-2">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleSaveAssignment(ticket)}
                                  disabled={isSaving || deletingId === ticket.id}
                                  className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
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
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-100">
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
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-100 px-3 pb-3 pt-2">
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
                <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
                  <table className="min-w-full border-separate border-spacing-0 text-base">
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
                        <tr key={ticket.id} className="odd:bg-white even:bg-slate-50/60 transition-all duration-200 hover:relative hover:z-[1] hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(15,23,42,0.14)]">
                          <td className="border-b border-gray-100 px-3 py-2 font-mono text-sm text-slate-600">
                            {displayTicketId(ticket)}
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
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-100">
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
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden bg-slate-100 p-3 md:flex-row">
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:max-w-[50%]">
                  <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
                    <table className="min-w-full border-separate border-spacing-0 text-base">
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
                              className={`odd:bg-white even:bg-slate-50/60 transition-all duration-200 hover:relative hover:z-[1] hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(15,23,42,0.14)] ${isSel ? 'bg-slate-100' : ''}`}
                            >
                              <td className="max-w-[8rem] border-b border-gray-100 px-3 py-2 font-mono text-sm text-slate-600">
                                {displayTicketId(ticket)}
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
                      <p className="mb-2 shrink-0 font-mono text-sm text-slate-500">{displayTicketId(selectedTicket)}</p>
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
                              <div className="min-w-0">
                                <span className="font-medium text-slate-800">{c.author || '—'}</span>
                                {isCommentOwner(c, user) && (
                                  <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700">
                                    You
                                  </span>
                                )}
                              </div>
                              <time
                                className="text-xs text-gray-500"
                                dateTime={c.updatedAt || c.createdAt}
                              >
                                {formatDate(c.updatedAt || c.createdAt)}
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
                                disabled={commentActionId === c.id || !isCommentOwner(c, user)}
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
