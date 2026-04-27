import { useCallback, useEffect, useMemo, useState } from 'react'
import { Ban, ClipboardList, Eye, ImageIcon, MessageSquareText, Pencil, Save, Send, Ticket, Trash2, User, Users, Wrench } from 'lucide-react'
import ActionToasts from '../../components/ActionToasts'
import TicketSlaCountdown from '../../components/TicketSlaCountdown'
import TicketWorkflowBar from '../../components/TicketWorkflowBar'
import { useAuth } from '../../context/AuthContext'
import { useActionToasts } from '../../hooks/useActionToasts'
import { API_BASE_URL, apiGet, apiSend } from '../../services/apiClient'

const ADMIN_TABS = [
  { id: 'view_all', label: 'View all tickets', icon: ClipboardList },
  { id: 'change_status', label: 'Update ticket status', icon: Pencil },
  { id: 'reject_reason', label: 'Reject tickets', icon: Ban },
  { id: 'assign_staff', label: 'Assign to technicians', icon: Users },
]

const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']

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

export default function AdminTicketsPage() {
  const { user } = useAuth()
  const { toasts, pushToast, dismissToast } = useActionToasts()
  const [activeTab, setActiveTab] = useState('view_all')
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusDrafts, setStatusDrafts] = useState({})
  const [statusSavingId, setStatusSavingId] = useState(null)
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
  const [adminViewFilter, setAdminViewFilter] = useState('all')
  const [expandedTickets, setExpandedTickets] = useState({})
  const [inlineCardActions, setInlineCardActions] = useState({})
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteSavingId, setDeleteSavingId] = useState(null)
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
    await loadTickets()
  }, [loadTickets])

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

  const getStatusDraft = useCallback(
    (ticket) => {
      const existing = statusDrafts[ticket.id]
      if (existing) return existing
      return {
        status: ticket.status || 'OPEN',
      }
    },
    [statusDrafts],
  )

  const updateStatusDraft = useCallback((ticketId, patch) => {
    setStatusDrafts((prev) => {
      const current = prev[ticketId] || { status: 'OPEN' }
      return {
        ...prev,
        [ticketId]: { ...current, ...patch },
      }
    })
  }, [])

  const getRejectDraft = useCallback(
    (ticket) => rejectDrafts[ticket.id] || '',
    [rejectDrafts],
  )

  const updateRejectDraft = useCallback((ticketId, value) => {
    setRejectDrafts((prev) => ({ ...prev, [ticketId]: value }))
  }, [])

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
      const draft = getStatusDraft(ticket)
      if (draft.status === 'REJECTED') {
        pushToast({
          title: 'Use reject',
          message: 'Use the Reject tickets section to reject a ticket.',
          variant: 'warning',
        })
        return
      }

      setStatusSavingId(ticket.id)
      try {
        await apiSend(`/api/tickets/${ticket.id}/status`, {
          method: 'PATCH',
          body: {
            status: draft.status,
            rejectReason: null,
          },
        })
        pushToast({
          title: 'Saved',
          message: `Status updated for ticket ${displayTicketId(ticket)}.`,
          variant: 'success',
        })
        await refreshTickets()
        clearInlineCardAction(ticketStateKey(ticket))
      } catch (e) {
        pushToast({
          title: 'Could not update status',
          message: e?.body?.message || e?.message || 'Could not update ticket status.',
          variant: 'error',
        })
      } finally {
        setStatusSavingId(null)
      }
    },
    [clearInlineCardAction, getStatusDraft, pushToast, refreshTickets],
  )

  const handleRejectWithReason = useCallback(
    async (ticket) => {
      const reason = getRejectDraft(ticket).trim()
      if (!reason) {
        pushToast({
          title: 'Reason needed',
          message: 'Please provide a reject reason before submitting.',
          variant: 'warning',
        })
        return
      }

      setRejectSavingId(ticket.id)
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
          message: `Ticket ${displayTicketId(ticket)} rejected successfully.`,
          variant: 'success',
        })
        setRejectDrafts((prev) => ({ ...prev, [ticket.id]: '' }))
        await refreshTickets()
        clearInlineCardAction(ticketStateKey(ticket))
      } catch (e) {
        pushToast({
          title: 'Could not reject ticket',
          message: e?.body?.message || e?.message || 'Could not reject ticket.',
          variant: 'error',
        })
      } finally {
        setRejectSavingId(null)
      }
    },
    [clearInlineCardAction, getRejectDraft, pushToast, refreshTickets],
  )

  const handleSaveAssignment = useCallback(
    async (ticket) => {
      const value = (getAssignDraft(ticket) || '').trim()
      setAssignSavingId(ticket.id)
      try {
        await apiSend(`/api/tickets/${ticket.id}/assignment`, {
          method: 'PATCH',
          body: { assignedTo: value || null },
        })
        pushToast({
          title: 'Saved',
          message: `Assignment updated for ticket ${displayTicketId(ticket)}.`,
          variant: 'success',
        })
        setAssignDrafts((prev) => ({ ...prev, [ticket.id]: value }))
        await refreshTickets()
        clearInlineCardAction(ticketStateKey(ticket))
      } catch (e) {
        pushToast({
          title: 'Could not save assignment',
          message: e?.body?.message || e?.message || 'Could not save assignment.',
          variant: 'error',
        })
      } finally {
        setAssignSavingId(null)
      }
    },
    [clearInlineCardAction, getAssignDraft, pushToast, refreshTickets],
  )

  const closeDeleteDialog = useCallback(() => {
    if (deleteSavingId) return
    setDeleteTarget(null)
  }, [deleteSavingId])

  const handleDeleteTicket = useCallback(async () => {
    if (!deleteTarget?.id) return

    setDeleteSavingId(deleteTarget.id)
    try {
      await apiSend(`/api/tickets/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      pushToast({
        title: 'Deleted',
        message: `Ticket ${displayTicketId(deleteTarget)} was deleted successfully.`,
        variant: 'success',
      })
      setDeleteTarget(null)
      await refreshTickets()
    } catch (e) {
      pushToast({
        title: 'Could not delete ticket',
        message: e?.body?.message || e?.message || 'Could not delete ticket.',
        variant: 'error',
      })
    } finally {
      setDeleteSavingId(null)
    }
  }, [deleteTarget, pushToast, refreshTickets])

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
      { key: 'all', label: 'All tickets', value: counts.all },
      { key: 'open', label: 'Open', value: counts.open },
      { key: 'pending', label: 'Pending', value: counts.pending },
      { key: 'resolved', label: 'Resolved', value: counts.resolved },
      { key: 'closed', label: 'Closed', value: counts.closed },
      { key: 'rejected', label: 'Rejected', value: counts.rejected },
    ]
  }, [tickets])

  const visibleTickets = useMemo(() => {
    if (activeTab === 'view_all') {
      return tickets.filter((ticket) => matchesAdminViewFilter(ticket, adminViewFilter))
    }
    return tickets
  }, [activeTab, adminViewFilter, tickets])

  const actionMode = useMemo(() => {
    if (activeTab === 'change_status') return 'status'
    if (activeTab === 'reject_reason') return 'reject'
    if (activeTab === 'assign_staff') return 'assign'
    return 'all'
  }, [activeTab])

  const tabMeta = {
    view_all: {
      title: 'View all tickets',
    },
    change_status: {
      title: 'Update ticket status',
    },
    reject_reason: {
      title: 'Reject tickets',
    },
    assign_staff: {
      title: 'Assign to technicians',
    },
  }

  const renderActionPanel = (ticket, ticketKey, cardAction) => {
    if (!cardAction) return null

    if (cardAction === 'status') {
      return (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <label className="mb-1 block text-xs font-medium text-slate-600">Change status</label>
          <div className="flex flex-wrap items-end gap-2">
            <select
              value={getStatusDraft(ticket).status}
              onChange={(e) => updateStatusDraft(ticket.id, { status: e.target.value })}
              disabled={statusSavingId === ticket.id}
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
              onClick={() => handleUpdateStatus(ticket)}
              disabled={statusSavingId === ticket.id}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" strokeWidth={2.2} />
              {statusSavingId === ticket.id ? 'Saving...' : 'Save status'}
            </button>
          </div>
        </div>
      )
    }

    if (cardAction === 'reject') {
      return (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3">
          <label className="mb-1 block text-xs font-medium text-rose-700">Reject reason</label>
          <textarea
            value={getRejectDraft(ticket)}
            onChange={(e) => updateRejectDraft(ticket.id, e.target.value)}
            rows={3}
            placeholder="Why is this ticket being rejected?"
            disabled={rejectSavingId === ticket.id}
            className="mb-2 w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100 disabled:bg-slate-100"
          />
          <button
            type="button"
            onClick={() => handleRejectWithReason(ticket)}
            disabled={rejectSavingId === ticket.id}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-700 px-3 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" strokeWidth={2.2} />
            {rejectSavingId === ticket.id ? 'Submitting...' : 'Reject'}
          </button>
        </div>
      )
    }

    if (cardAction === 'assign') {
      return (
        <div className="mt-3 rounded-xl border border-cyan-200 bg-cyan-50 p-3">
          <label className="mb-1 block text-xs font-medium text-cyan-800">Assign technician</label>
          <div className="flex flex-wrap items-end gap-2">
            <select
              value={getAssignDraft(ticket)}
              onChange={(e) => updateAssignDraft(ticket.id, e.target.value)}
              disabled={assignSavingId === ticket.id || techniciansLoading}
              className="min-w-[14rem] flex-1 rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-100 disabled:bg-slate-100"
            >
              <option value="">{techniciansLoading ? 'Loading technicians...' : 'Unassigned'}</option>
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
              disabled={assignSavingId === ticket.id || techniciansLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <User className="h-4 w-4" strokeWidth={2.2} />
              {assignSavingId === ticket.id ? 'Saving...' : 'Assign'}
            </button>
          </div>
        </div>
      )
    }

    return null
  }

  const renderTicketCard = (ticket, index) => {
    const ticketKey = ticketStateKey(ticket)
    const isExpanded = Boolean(expandedTickets[ticketKey])
    const cardAction = inlineCardActions[ticketKey] || null
    const attachmentFiles = Array.isArray(ticket.attachmentFileNames)
      ? ticket.attachmentFileNames.filter(Boolean)
      : []
    const ticketComments = Array.isArray(ticket.comments) ? ticket.comments : []

    return (
      <li
        key={ticketKey}
        className="ticket-enter relative mx-auto w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_14px_30px_rgba(15,23,42,0.12)] lg:w-[74%]"
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
                  {displayTicketId(ticket)}
                </span>
                <p className="mt-2 text-lg font-semibold text-slate-900">{displaySubject(ticket)}</p>
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => setExpandedTickets((prev) => ({ ...prev, [ticketKey]: !prev[ticketKey] }))}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800 transition duration-200 hover:-translate-y-0.5 hover:border-slate-900 hover:bg-slate-950 hover:text-white hover:shadow-sm"
                  >
                    <Eye className="h-4 w-4" strokeWidth={2.2} />
                    {isExpanded ? 'Hide details' : 'View all'}
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {actionMode === 'status' ? (
                    <button
                      type="button"
                      onClick={() => toggleInlineCardAction(ticketKey, 'status')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 transition duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-100"
                    >
                      <Pencil className="h-4 w-4" strokeWidth={2.2} />
                      Update
                    </button>
                  ) : actionMode === 'reject' ? (
                    <button
                      type="button"
                      onClick={() => toggleInlineCardAction(ticketKey, 'reject')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition duration-200 hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-100"
                    >
                      <Ban className="h-4 w-4" strokeWidth={2.2} />
                      Reject
                    </button>
                  ) : null}
                </div>

                {renderActionPanel(ticket, ticketKey, actionMode === 'assign' ? 'assign' : cardAction)}
              </div>

              <div className="flex shrink-0 flex-col items-end gap-2 self-start">
                <div className="max-w-full">
                  <TicketWorkflowBar status={ticket.status} rejectReason={ticket.rejectReason} compact />
                </div>
                <p className="text-right text-sm text-gray-600">
                  <time dateTime={ticket.createdAt}>{formatDate(ticket.createdAt)}</time>
                </p>
                {actionMode === 'all' && (
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(ticket)}
                    aria-label={`Delete ticket ${displayTicketId(ticket)}`}
                    title="Delete ticket"
                    className="inline-flex items-center justify-center self-end p-1 text-rose-700 transition duration-200 hover:-translate-y-0.5 hover:text-rose-800"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2.2} />
                  </button>
                )}
              </div>
            </div>
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

            {ticket.status === 'REJECTED' && (
              <div className="mt-3 max-w-xs">
                <TicketWorkflowBar status={ticket.status} rejectReason={ticket.rejectReason} />
              </div>
            )}

            {attachmentFiles.length > 0 && (
              <div className="mt-3">
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

            {ticket.assignedTo && (
              <p className="mt-2 text-sm text-gray-600">
                <span className="font-medium text-slate-700">Assigned to:</span> {ticket.assignedTo}
              </p>
            )}

            {ticketComments.length > 0 && (
              <div className="mt-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="m-0 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <MessageSquareText className="h-4 w-4 text-slate-500" strokeWidth={2.2} />
                    Comments
                  </p>
                  <span className="text-xs text-slate-500">
                    {ticketComments.length} {ticketComments.length === 1 ? 'comment' : 'comments'}
                  </span>
                </div>
                <div className="space-y-2">
                  {ticketComments.map((comment) => (
                    <div
                      key={comment.id}
                      className={`rounded-xl border px-3 py-2 text-sm ${
                        comment.hidden ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-medium text-slate-800">{comment.author || '—'}</span>
                          {comment.hidden && (
                            <span className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-900">
                              Hidden
                            </span>
                          )}
                        </div>
                        <time className="text-xs text-gray-500" dateTime={comment.updatedAt || comment.createdAt}>
                          {formatDate(comment.updatedAt || comment.createdAt)}
                        </time>
                      </div>
                      <p className="m-0 whitespace-pre-wrap text-slate-700">{comment.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </li>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full flex-col overflow-hidden bg-slate-100 text-slate-900 md:h-[calc(100vh-4rem)] md:min-h-0 md:flex-row">
      <ActionToasts toasts={toasts} onDismiss={dismissToast} />
      {deleteTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-[2px]">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-ticket-title"
            aria-describedby="delete-ticket-message"
            className="w-full max-w-md rounded-[1.75rem] border border-rose-200 bg-white p-6 shadow-[0_28px_60px_rgba(15,23,42,0.22)]"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 border-rose-200 bg-rose-50 text-rose-600">
              <Trash2 className="h-8 w-8" strokeWidth={2.2} />
            </div>
            <h2 id="delete-ticket-title" className="mt-5 text-center text-2xl font-semibold text-slate-900">
              Delete ticket?
            </h2>
            <p id="delete-ticket-message" className="mt-3 text-center text-sm leading-6 text-slate-500">
              Ticket {displayTicketId(deleteTarget)} will be permanently deleted. This action cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={closeDeleteDialog}
                disabled={deleteSavingId === deleteTarget.id}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTicket}
                disabled={deleteSavingId === deleteTarget.id}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl bg-rose-600 px-4 text-sm font-semibold text-white transition duration-200 hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleteSavingId === deleteTarget.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      <aside className="border-b border-slate-200 bg-slate-950 text-white md:flex md:h-full md:w-72 md:shrink-0 md:flex-col md:self-stretch md:border-b-0 md:border-r md:border-slate-800">
        <div className="border-b border-white/10 px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            Admin
          </p>
          <h1 className="mt-2 text-lg font-semibold text-white">Incident &amp; maintenance</h1>
        </div>
        <nav
          aria-label="Admin ticket tasks"
          className="flex flex-row gap-2 overflow-x-auto p-3 md:flex-1 md:flex-col md:justify-start md:gap-3 md:overflow-y-auto md:overflow-x-hidden md:px-3 md:py-6"
        >
          {ADMIN_TABS.map((tab) => {
            const isActive = activeTab === tab.id
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full shrink-0 rounded-xl px-4 py-3 text-center text-sm font-semibold transition md:text-left ${
                  isActive
                    ? 'bg-white/[0.14] text-white shadow-sm'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Icon className="h-4 w-4" strokeWidth={2.2} />
                  {tab.label}
                </span>
              </button>
            )
          })}
        </nav>
      </aside>

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-slate-100 md:h-full">
        <div className="relative z-10 border-b border-slate-200 bg-white px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
            Admin tickets
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="inline-flex items-center gap-2 text-2xl font-semibold text-slate-900">
                <Wrench className="h-6 w-6 text-sky-700" strokeWidth={2.2} />
                {tabMeta[activeTab].title}
              </h2>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden px-3 pb-4 pt-3">
          {activeTab === 'view_all' && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
              {viewAllCards.map((card) => {
                const isActive = adminViewFilter === card.key
                return (
                  <button
                    key={card.key}
                    type="button"
                    onClick={() => setAdminViewFilter(card.key)}
                    className={`rounded-xl border px-4 py-3 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                      isActive
                        ? 'border-slate-900 bg-slate-900 text-white ring-2 ring-slate-900/20'
                        : 'border-slate-200 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <p
                      className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
                        isActive ? 'text-white/80' : 'text-slate-500'
                      }`}
                    >
                      {card.label}
                    </p>
                    <p className={`mt-1 text-3xl font-semibold leading-none ${isActive ? 'text-white' : ''}`}>
                      {card.value}
                    </p>
                  </button>
                )
              })}
            </div>
          )}

          {loading && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
              Loading tickets...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
              {error}
            </div>
          )}

          {!loading && !error && visibleTickets.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center text-sm text-slate-500">
              No tickets found in the database.
            </div>
          )}

          {!loading && !error && visibleTickets.length > 0 && (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {visibleTickets.map((ticket, index) => renderTicketCard(ticket, index))}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}
