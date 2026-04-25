import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import TicketWorkflowBar from '../../components/TicketWorkflowBar'
import { useAuth } from '../../context/AuthContext'
import { apiGet, apiSend } from '../../services/apiClient'

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

export default function TicketsListPage() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [commentDrafts, setCommentDrafts] = useState({})
  const [commentSavingTicketId, setCommentSavingTicketId] = useState(null)
  const [commentActionId, setCommentActionId] = useState(null)
  const [editCommentId, setEditCommentId] = useState(null)
  const [editDrafts, setEditDrafts] = useState({})

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
      setError(null)
      try {
        await apiSend(`/api/tickets/${ticketId}/comments`, {
          method: 'POST',
          body: { body },
        })
        setCommentDrafts((prev) => ({ ...prev, [ticketId]: '' }))
        await loadTickets()
      } catch (e) {
        setError(e?.body?.message || e?.message || 'Could not add comment.')
      } finally {
        setCommentSavingTicketId(null)
      }
    },
    [commentDrafts, loadTickets],
  )

  const handleSaveCommentEdit = useCallback(
    async (ticketId, commentId) => {
      const body = (editDrafts[commentId] || '').trim()
      if (!body) return

      setCommentActionId(commentId)
      setError(null)
      try {
        await apiSend(`/api/tickets/${ticketId}/comments/${commentId}/body`, {
          method: 'PATCH',
          body: { body },
        })
        setEditCommentId(null)
        await loadTickets()
      } catch (e) {
        setError(e?.body?.message || e?.message || 'Could not update comment.')
      } finally {
        setCommentActionId(null)
      }
    },
    [editDrafts, loadTickets],
  )

  const handleDeleteComment = useCallback(
    async (ticketId, commentId) => {
      const ok = window.confirm('Delete this comment permanently?')
      if (!ok) return

      setCommentActionId(commentId)
      setError(null)
      try {
        await apiSend(`/api/tickets/${ticketId}/comments/${commentId}`, {
          method: 'DELETE',
        })
        if (editCommentId === commentId) {
          setEditCommentId(null)
        }
        await loadTickets()
      } catch (e) {
        setError(e?.body?.message || e?.message || 'Could not delete comment.')
      } finally {
        setCommentActionId(null)
      }
    },
    [editCommentId, loadTickets],
  )

  return (
    <section className="w-full">
      <header className="mb-4 flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-slate-900">Incident tickets</h1>
        </div>
        <Link
          to="/tickets/new"
          className="inline-flex min-h-10 w-fit max-w-full shrink-0 items-center justify-center rounded-md bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-slate-900/10 transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 sm:ml-auto"
          title="+create incident ticket"
          aria-label="Create incident ticket"
        >
          +create incident ticket
        </Link>
      </header>

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
            No tickets in the database yet. Use <strong>+create incident ticket</strong> above.
          </p>
        </div>
      )}

      {!loading && !error && tickets.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {tickets.map((ticket) => {
            const visibleComments = (ticket.comments || []).filter((comment) => !comment.hidden)
            const commentDraft = commentDrafts[ticket.id] || ''
            const isCommentSaving = commentSavingTicketId === ticket.id

            return (
              <li
                key={ticket.id}
                className="rounded-md border border-gray-200 bg-white px-4 py-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span
                      className="block break-all font-mono text-sm font-medium text-slate-700"
                      title={ticket.id}
                    >
                      {displayTicketNumber(ticket)}
                    </span>
                    <div className="mt-2">
                      <TicketWorkflowBar
                        status={ticket.status}
                        rejectReason={ticket.rejectReason}
                        compact
                      />
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase text-slate-700">
                      {formatCategory(ticket.status)}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${priorityClasses(ticket.priority)}`}
                    >
                      {ticket.priority || '—'}
                    </span>
                  </div>
                </div>

                <p className="mt-3 text-sm text-gray-600">
                  <span>{formatCategory(ticket.category)}</span>
                  <span className="mx-2 text-gray-300">·</span>
                  <time dateTime={ticket.createdAt}>{formatDate(ticket.createdAt)}</time>
                </p>
                <p className="mt-1 break-all font-mono text-xs text-gray-500">
                  Resource: {ticket.resourceId || 'Not linked'}
                </p>

                <p className="mt-2 text-sm leading-6 text-gray-800">
                  {excerpt(ticket.description, 100)}
                </p>

                <div className="mt-3 border-t border-slate-200 pt-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="m-0 text-sm font-semibold text-slate-900">Comments</p>
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
                            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
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
                                    className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                                  >
                                    {isBusy ? 'Saving...' : 'Save'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={cancelEditingComment}
                                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
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
                                      className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => handleDeleteComment(ticket.id, comment.id)}
                                      className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                                    >
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
                        className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                      >
                        {isCommentSaving ? 'Adding...' : 'Add comment'}
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
