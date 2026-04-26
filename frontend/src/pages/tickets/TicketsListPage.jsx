import { useCallback, useEffect, useRef, useState } from 'react'
import { Eye, FileText, ImageIcon, MessageSquareText, Pencil, PlusCircle, Ticket, Trash2 } from 'lucide-react'
import ActionToasts from '../../components/ActionToasts'
import TicketParticlesBackground from '../../components/TicketParticlesBackground'
import TicketWorkflowBar from '../../components/TicketWorkflowBar'
import { useAuth } from '../../context/AuthContext'
import { useResources } from '../../hooks/useResources'
import { useActionToasts } from '../../hooks/useActionToasts'
import { TICKET_CATEGORIES, TICKET_PRIORITIES } from '../../constants/ticketOptions'
import { API_BASE_URL, apiGet, apiPostFormData, apiSend } from '../../services/apiClient'

const TICKET_FILTERS = [
  { id: 'CREATE', label: 'Create new ticket', icon: PlusCircle },
  { id: 'ALL', label: 'All Tickets', icon: FileText },
]

const MAX_ATTACHMENTS = 3

const SLA_TARGETS_MINUTES = {
  URGENT: { firstResponse: 30, resolution: 4 * 60 },
  HIGH: { firstResponse: 2 * 60, resolution: 24 * 60 },
  MEDIUM: { firstResponse: 4 * 60, resolution: 48 * 60 },
  LOW: { firstResponse: 8 * 60, resolution: 72 * 60 },
}

function formatCategory(c) {
  if (!c) return '—'
  return String(c).replaceAll('_', ' ')
}

function formatDate(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return String(iso)
  }
}

function excerpt(text, max = 120) {
  if (!text) return ''
  const t = text.trim()
  return t.length <= max ? t : `${t.slice(0, max)}…`
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

function displayTicketNumber(ticket) {
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

function formatSubmitError(err) {
  const msg = err?.body?.message
  if (typeof msg === 'string') return msg
  if (msg && typeof msg === 'object') {
    return Object.values(msg).join(' ')
  }
  return err?.message || 'Something went wrong.'
}

function formatDurationMinutes(totalMinutes) {
  const mins = Math.max(0, Math.round(totalMinutes))
  const days = Math.floor(mins / 1440)
  const hours = Math.floor((mins % 1440) / 60)
  const minutes = mins % 60
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function slaToneClasses(tone) {
  switch (tone) {
    case 'good':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'warn':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'bad':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200'
  }
}

function buildSlaState({ createdAt, endedAt, targetMinutes }) {
  if (!createdAt || !targetMinutes) {
    return { text: 'N/A', tone: 'neutral' }
  }
  const startMs = new Date(createdAt).getTime()
  if (Number.isNaN(startMs)) {
    return { text: 'N/A', tone: 'neutral' }
  }

  const nowMs = Date.now()
  const endMs = endedAt ? new Date(endedAt).getTime() : nowMs
  if (Number.isNaN(endMs)) {
    return { text: 'N/A', tone: 'neutral' }
  }

  const elapsedMinutes = (endMs - startMs) / 60000
  if (endedAt) {
    const onTime = elapsedMinutes <= targetMinutes
    return {
      text: onTime ? `On time (${formatDurationMinutes(elapsedMinutes)})` : `Breached (${formatDurationMinutes(elapsedMinutes)})`,
      tone: onTime ? 'good' : 'bad',
    }
  }

  const remaining = targetMinutes - elapsedMinutes
  if (remaining < 0) {
    return { text: `Overdue by ${formatDurationMinutes(Math.abs(remaining))}`, tone: 'bad' }
  }
  if (remaining <= targetMinutes * 0.25) {
    return { text: `Due in ${formatDurationMinutes(remaining)}`, tone: 'warn' }
  }
  return { text: `Due in ${formatDurationMinutes(remaining)}`, tone: 'good' }
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

function matchesFilter(ticket, filterId) {
  if (filterId === 'CREATE') return false
  if (filterId === 'ALL') return true
  if (filterId === 'PENDING') return ticket?.status === 'IN_PROGRESS'
  return ticket?.status === filterId
}

function filterCount(tickets, filterId) {
  return tickets.filter((ticket) => matchesFilter(ticket, filterId)).length
}

export default function TicketsListPage() {
  const { user } = useAuth()
  const { resources, loading: resourcesLoading, loadError: resourcesError } = useResources()
  const { toasts, pushToast, dismissToast } = useActionToasts()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeFilter, setActiveFilter] = useState('CREATE')
  const [expandedTickets, setExpandedTickets] = useState({})
  const [commentDrafts, setCommentDrafts] = useState({})
  const [commentSavingTicketId, setCommentSavingTicketId] = useState(null)
  const [commentActionId, setCommentActionId] = useState(null)
  const [editCommentId, setEditCommentId] = useState(null)
  const [editDrafts, setEditDrafts] = useState({})
  const [subject, setSubject] = useState('')
  const [location, setLocation] = useState('')
  const [resourceId, setResourceId] = useState('')
  const [category, setCategory] = useState('GENERAL')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('MEDIUM')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [attachments, setAttachments] = useState([])
  const attachmentsRef = useRef(attachments)
  const [submitPhase, setSubmitPhase] = useState('idle')
  const [submitError, setSubmitError] = useState(null)
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

  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockTick(Date.now())
    }, 60000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    attachmentsRef.current = attachments
  }, [attachments])

  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach((attachment) => URL.revokeObjectURL(attachment.url))
    }
  }, [])

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

  const addFiles = useCallback((fileList) => {
    const incoming = Array.from(fileList || []).filter((file) => file.type.startsWith('image/'))
    if (incoming.length === 0) return

    setAttachments((prev) => {
      const next = [...prev]
      for (const file of incoming) {
        if (next.length >= MAX_ATTACHMENTS) break
        next.push({ file, url: URL.createObjectURL(file) })
      }
      return next
    })
  }, [])

  const removeAttachment = useCallback((index) => {
    setAttachments((prev) => {
      const next = [...prev]
      const [removed] = next.splice(index, 1)
      if (removed) {
        URL.revokeObjectURL(removed.url)
      }
      return next
    })
  }, [])

  const handleFileChange = useCallback(
    (e) => {
      addFiles(e.target.files)
      e.target.value = ''
    },
    [addFiles],
  )

  const handleSubmitTicket = useCallback(
    async (e) => {
      e.preventDefault()
      const hasSubject = subject.trim().length > 0
      const hasLocation = location.trim().length > 0
      const hasContact = contactEmail.trim().length > 0 || contactPhone.trim().length > 0

      if (!hasSubject || !hasLocation || !hasContact || description.trim().length < 10) {
        return
      }

      setSubmitPhase('loading')
      setSubmitError(null)

      const formData = new FormData()
      formData.append('subject', subject.trim())
      formData.append('location', location.trim())
      if (resourceId) formData.append('resourceId', resourceId)
      formData.append('category', category)
      formData.append('priority', priority)
      formData.append('description', description.trim())

      const email = contactEmail.trim()
      const phone = contactPhone.trim()
      if (email) formData.append('contactEmail', email)
      if (phone) formData.append('contactPhone', phone)

      attachments.forEach((attachment) => {
        formData.append('files', attachment.file)
      })

      try {
        await apiPostFormData('/api/tickets', formData)
        attachments.forEach((attachment) => URL.revokeObjectURL(attachment.url))
        setAttachments([])
        setSubject('')
        setLocation('')
        setResourceId('')
        setCategory('GENERAL')
        setDescription('')
        setPriority('MEDIUM')
        setContactEmail('')
        setContactPhone('')
        setSubmitPhase('idle')
        setActiveFilter('ALL')
        pushToast({
          title: 'Submitted',
          message: 'Your ticket was created successfully.',
          variant: 'success',
        })
        await loadTickets()
      } catch (err) {
        setSubmitPhase('error')
        setSubmitError(formatSubmitError(err))
        pushToast({
          title: 'Submission failed',
          message: formatSubmitError(err),
          variant: 'error',
        })
      }
    },
    [
      attachments,
      category,
      contactEmail,
      contactPhone,
      description,
      loadTickets,
      location,
      priority,
      resourceId,
      subject,
      pushToast,
    ],
  )

  const toggleExpandedTicket = useCallback((ticketId) => {
    setExpandedTickets((prev) => ({
      ...prev,
      [ticketId]: !prev[ticketId],
    }))
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
      } catch (e) {
        pushToast({
          title: 'Could not add comment',
          message: e?.body?.message || e?.message || 'Could not add comment.',
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
      } catch (e) {
        pushToast({
          title: 'Could not save comment',
          message: e?.body?.message || e?.message || 'Could not update comment.',
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
      } catch (e) {
        pushToast({
          title: 'Could not delete comment',
          message: e?.body?.message || e?.message || 'Could not delete comment.',
          variant: 'error',
        })
      } finally {
        setCommentActionId(null)
      }
    },
    [editCommentId, loadTickets, pushToast],
  )

  const visibleTickets = tickets.filter((ticket) => matchesFilter(ticket, activeFilter))
  const showCreateForm = activeFilter === 'CREATE'
  const canSubmit =
    subject.trim().length > 0 &&
    location.trim().length > 0 &&
    (contactEmail.trim().length > 0 || contactPhone.trim().length > 0) &&
    description.trim().length >= 10
  const submitting = submitPhase === 'loading'

  return (
    <section className="relative isolate w-full min-w-0 overflow-hidden">
      <TicketParticlesBackground />
      <div className="relative z-10">
        <ActionToasts toasts={toasts} onDismiss={dismissToast} />
        <header className="mb-3 flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="h-5" aria-hidden="true" />
          </div>
        </header>

        <div className="mb-3 grid max-w-3xl gap-3 sm:mx-auto sm:grid-cols-2">
          {TICKET_FILTERS.map((filter) => {
            const isActive = activeFilter === filter.id
            const count = filter.id === 'CREATE' ? null : filterCount(tickets, filter.id)
            const Icon = filter.icon

            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                className={`rounded-lg border px-4 py-4 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                    : 'border-gray-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-medium uppercase tracking-[0.16em] ${
                        isActive ? 'text-slate-200' : 'text-slate-500'
                      }`}
                    >
                      {filter.label}
                    </p>
                  </div>
                  <span
                    className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                      isActive
                        ? 'border-white/20 bg-white/10 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2.2} />
                  </span>
                </div>
                <p className="mt-2 text-3xl font-semibold">
                  {filter.id === 'CREATE' ? '+' : count}
                </p>
              </button>
            )
          })}
        </div>

      {showCreateForm ? (
        <div className="mb-4 w-full rounded-2xl border-2 border-slate-950 bg-white px-4 py-2.5 shadow-[0_16px_32px_rgba(2,6,23,0.08)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_40px_rgba(2,6,23,0.14)] sm:px-5 lg:mx-auto lg:w-[70%]">
          <div className="mb-1.5 flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Create new ticket
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">New incident ticket</h2>
            </div>
          </div>

          <form onSubmit={handleSubmitTicket} noValidate className="w-full space-y-2.5">
            <div className="grid gap-2.5 xl:grid-cols-2">
              <div>
                <label htmlFor="subject" className="mb-1 block text-sm font-medium text-gray-700">
                  Subject
                </label>
                <input
                  id="subject"
                  type="text"
                  autoComplete="off"
                  placeholder="Brief summary of the issue"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={submitting}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition duration-200 hover:border-sky-400 hover:shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-gray-100"
                />
              </div>

              <div>
                <label htmlFor="resourceId" className="mb-1 block text-sm font-medium text-gray-700">
                  Resource (optional)
                </label>
                <select
                  id="resourceId"
                  value={resourceId}
                  onChange={(e) => setResourceId(e.target.value)}
                  disabled={submitting || resourcesLoading}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition duration-200 hover:border-sky-400 hover:shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-gray-100"
                >
                  <option value="">Not linked to a specific resource</option>
                  {resources.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name || 'Unnamed resource'} ({r.type || 'OTHER'})
                    </option>
                  ))}
                </select>
                {resourcesError && <p className="mt-1 text-xs text-amber-700">{resourcesError}</p>}
              </div>
            </div>

            <div className="grid gap-2.5 xl:grid-cols-3">
              <div>
                <label htmlFor="location" className="mb-1 block text-sm font-medium text-gray-700">
                  Location
                </label>
                <input
                  id="location"
                  type="text"
                  autoComplete="off"
                  placeholder="e.g. Block C, Level 2, corridor by stairs"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={submitting}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition duration-200 hover:border-sky-400 hover:shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-gray-100"
                />
              </div>

              <div>
                <label htmlFor="category" className="mb-1 block text-sm font-medium text-gray-700">
                  Category
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={submitting}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition duration-200 hover:border-sky-400 hover:shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-gray-100"
                >
                  {TICKET_CATEGORIES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="priority" className="mb-1 block text-sm font-medium text-gray-700">
                  Priority
                </label>
                <select
                  id="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  disabled={submitting}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition duration-200 hover:border-sky-400 hover:shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-gray-100"
                >
                  {TICKET_PRIORITIES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                required
                minLength={10}
                maxLength={4000}
                placeholder="Describe the issue (minimum 10 characters)."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={submitting}
                className="min-h-14 w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 transition duration-200 hover:border-sky-400 hover:shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-gray-100"
              />
            </div>

            <div className="grid gap-2.5 lg:grid-cols-2">
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                  Preferred contact email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@university.edu"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  disabled={submitting}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition duration-200 hover:border-sky-400 hover:shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-gray-100"
                />
              </div>

              <div>
                <label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-700">
                  Preferred contact phone
                </label>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+94 ..."
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  disabled={submitting}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition duration-200 hover:border-sky-400 hover:shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-gray-100"
                />
              </div>
            </div>

            <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
              <div className="rounded-md border border-dashed border-slate-300 bg-gray-50 px-3 py-1.5 transition duration-200 hover:border-sky-400 hover:bg-sky-50/40">
                <label htmlFor="evidence" className="mb-1 block text-sm font-semibold text-gray-700">
                  Evidence images
                </label>
                <p className="mb-1.5 text-xs text-gray-500">
                  Up to {MAX_ATTACHMENTS} images. Use the file picker to attach screenshots or photos.
                </p>
                <div>
                  <input
                    id="evidence"
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={submitting || attachments.length >= MAX_ATTACHMENTS}
                    onChange={handleFileChange}
                    className="max-w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-sky-600 file:px-3 file:py-1.5 file:text-sm file:text-white hover:file:bg-sky-500 disabled:cursor-not-allowed"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {attachments.length} / {MAX_ATTACHMENTS} attached
                </p>

                {attachments.length > 0 && (
                  <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2">
                    {attachments.map((attachment, index) => (
                      <div
                        key={attachment.url}
                        className="relative aspect-square overflow-hidden rounded-md border border-gray-200 bg-gray-200 transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <img
                          src={attachment.url}
                          alt={attachment.file.name}
                          className="block h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-base leading-none text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label={`Remove image ${index + 1}`}
                          onClick={() => removeAttachment(index)}
                          disabled={submitting}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex xl:justify-end">
                <button
                  type="submit"
                className="rounded-md bg-sky-600 px-5 py-[0.34rem] text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-sky-500 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-55"
                  disabled={!canSubmit || submitting}
                >
                  {submitting ? 'Submitting…' : 'Submit ticket'}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        <>
          <div className="mb-3 w-full text-left lg:mx-auto lg:w-[60%]">
            <h2 className="text-lg font-semibold text-slate-900">Your Tickets</h2>
          </div>

          {loading && (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white px-5 py-8 text-center text-sm text-gray-500">
              <p>Loading tickets…</p>
            </div>
          )}

          {!loading && error && (
            <div
              className="rounded-lg border border-dashed border-gray-300 bg-white px-5 py-8 text-center text-sm text-gray-500"
              role="alert"
            >
              <p>{error}</p>
              <p className="mt-3">
                <button
                  type="button"
                  className="rounded-md border border-slate-900 bg-slate-900 px-4 py-1.5 text-sm text-white transition hover:bg-slate-800"
                  onClick={loadTickets}
                >
                  Retry
                </button>
              </p>
            </div>
          )}

          {!loading && !error && tickets.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white px-5 py-8 text-center text-sm text-gray-500">
              <p>
                No tickets in the database yet. Use <strong>Create new ticket</strong> above.
              </p>
            </div>
          )}

          {!loading && !error && tickets.length > 0 && visibleTickets.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white px-5 py-8 text-center text-sm text-gray-500">
              <p>No tickets match the selected filter.</p>
            </div>
          )}

          {!loading && !error && visibleTickets.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {visibleTickets.map((ticket, index) => {
            const visibleComments = (ticket.comments || []).filter((comment) => !comment.hidden)
            const attachmentFiles = Array.isArray(ticket.attachmentFileNames)
              ? ticket.attachmentFileNames.filter(Boolean)
              : []
            const commentDraft = commentDrafts[ticket.id] || ''
            const isCommentSaving = commentSavingTicketId === ticket.id
            const isExpanded = Boolean(expandedTickets[ticket.id])

            return (
              <li
                key={ticket.id}
                className="ticket-enter mx-auto w-full rounded-md border border-gray-200 bg-white px-4 py-3 shadow-sm transition duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:border-slate-900 hover:bg-slate-950/5 hover:shadow-[0_18px_36px_rgba(15,23,42,0.18)] lg:w-[60%]"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <div className="flex items-center gap-4">
                  <div className="flex shrink-0 items-center justify-center py-2">
                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 text-sky-700 shadow-sm">
                      <Ticket className="h-8 w-8" strokeWidth={2.2} />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span
                          className="block break-all font-mono text-base font-medium text-slate-700"
                          title={ticket.id}
                        >
                          {displayTicketNumber(ticket)}
                        </span>
                        <p className="mt-2 text-lg font-semibold text-slate-900">{displaySubject(ticket)}</p>
                        <div className="mt-2 flex justify-start">
                          <button
                            type="button"
                            onClick={() => toggleExpandedTicket(ticket.id)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800 transition duration-200 hover:-translate-y-0.5 hover:border-slate-900 hover:bg-slate-950 hover:text-white hover:shadow-sm"
                          >
                            <Eye className="h-3.5 w-3.5" strokeWidth={2.2} />
                            {isExpanded ? 'Hide details' : 'View all'}
                          </button>
                        </div>
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
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-sm font-semibold uppercase text-slate-700">
                            {formatCategory(ticket.status)}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-sm font-semibold uppercase ${priorityClasses(ticket.priority)}`}
                          >
                            {ticket.priority || '—'}
                          </span>
                        </div>
                        <p className="text-right text-sm text-gray-600">
                          <time dateTime={ticket.createdAt}>{formatDate(ticket.createdAt)}</time>
                        </p>
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
                    <p className="mt-2 text-base leading-7 text-gray-800">{excerpt(ticket.description, 100)}</p>

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

                    <div className="mt-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
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
                                className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 transition duration-200 hover:bg-slate-100 hover:shadow-sm"
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
                                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition duration-200 hover:border-sky-400 hover:shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                                    />
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        disabled={isBusy || !editDraft.trim()}
                                        onClick={() => handleSaveCommentEdit(ticket.id, comment.id)}
                                        className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:opacity-50"
                                      >
                                        {isBusy ? 'Saving...' : 'Save'}
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={cancelEditingComment}
                                        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-100 disabled:opacity-50"
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
                                          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-100 disabled:opacity-50"
                                        >
                                          <Pencil className="h-3.5 w-3.5" strokeWidth={2.2} />
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          disabled={isBusy}
                                          onClick={() => handleDeleteComment(ticket.id, comment.id)}
                                          className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:-translate-y-0.5 hover:bg-red-50 disabled:opacity-50"
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
                          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition duration-200 hover:border-sky-400 hover:shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                          placeholder="Add a comment to this ticket..."
                        />
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <button
                            type="button"
                            disabled={isCommentSaving || !commentDraft.trim()}
                            onClick={() => handleAddComment(ticket.id)}
                            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:opacity-50"
                          >
                            <MessageSquareText className="h-3.5 w-3.5" strokeWidth={2.2} />
                            {isCommentSaving ? 'Adding...' : 'Add comment'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
          )}
        </>
      )}
      </div>
    </section>
  )
}
