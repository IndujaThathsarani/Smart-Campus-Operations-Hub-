import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { apiGet, apiSend } from '../../services/apiClient'
import TicketWorkflowBar from '../../components/TicketWorkflowBar'

const STATUS_TABS = ['OPEN', 'IN_PROGRESS', 'RESOLVED']

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

function ticketLabel(ticket) {
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

export default function TechnicianTicketsDashboard() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeStatus, setActiveStatus] = useState('OPEN')
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

  const counts = useMemo(() => {
    return tickets.reduce(
      (acc, ticket) => {
        const status = String(ticket.status || 'OPEN')
        acc[status] = (acc[status] || 0) + 1
        if (ticket.assignedTo) {
          acc.assigned += 1
        } else {
          acc.unassigned += 1
        }
        return acc
      },
      {
        OPEN: 0,
        IN_PROGRESS: 0,
        RESOLVED: 0,
        CLOSED: 0,
        REJECTED: 0,
        assigned: 0,
        unassigned: 0,
      },
    )
  }, [tickets])

  const filteredTickets = useMemo(
    () => tickets.filter((ticket) => ticket.status === activeStatus),
    [tickets, activeStatus],
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
      setError(null)
      try {
        await apiSend(`/api/tickets/${ticketId}/comments`, {
          method: 'POST',
          body: { body },
        })
        setCommentDrafts((prev) => ({ ...prev, [ticketId]: '' }))
        await loadTickets()
      } catch (err) {
        setError(err?.body?.message || err?.message || 'Could not add comment.')
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
      } catch (err) {
        setError(err?.body?.message || err?.message || 'Could not update comment.')
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
      } catch (err) {
        setError(err?.body?.message || err?.message || 'Could not delete comment.')
      } finally {
        setCommentActionId(null)
      }
    },
    [editCommentId, loadTickets],
  )

  return (
    <section className="relative w-full max-w-none">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1 sm:pr-4">
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
            Technician dashboard
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">Maintenance ticket overview</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            See the latest work queue, ticket status breakdowns, and assigned maintenance requests in one place.
          </p>
        </div>
        <div className="flex flex-none flex-wrap gap-3">
          <button
            type="button"
            onClick={loadTickets}
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Refresh list
          </button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_0.9fr]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">Open tickets</p>
              <p className="mt-3 text-4xl font-semibold text-slate-900">{counts.OPEN}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">In progress</p>
              <p className="mt-3 text-4xl font-semibold text-slate-900">{counts.IN_PROGRESS}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">Assigned tickets</p>
              <p className="mt-3 text-4xl font-semibold text-slate-900">{counts.assigned}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Status view</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Filter the queue by ticket lifecycle state.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {STATUS_TABS.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setActiveStatus(status)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      activeStatus === status
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {formatEnum(status)}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Total</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {filteredTickets.length}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Assigned</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {filteredTickets.filter((ticket) => ticket.assignedTo).length}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Unassigned</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {filteredTickets.filter((ticket) => !ticket.assignedTo).length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Work queue</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Tickets currently in {formatEnum(activeStatus).toLowerCase()} state.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold uppercase tracking-wide text-slate-700">
                {filteredTickets.length} items
              </span>
            </div>

            {loading && (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
                Loading tickets…
              </div>
            )}

            {!loading && error && (
              <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-900">
                <p>{error}</p>
              </div>
            )}

            {!loading && !error && filteredTickets.length === 0 && (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
                No tickets match this status. Try another view or refresh the list.
              </div>
            )}

            {!loading && !error && filteredTickets.length > 0 && (
              <ul className="mt-6 space-y-4">
                {filteredTickets.map((ticket) => {
                  const visibleComments = (ticket.comments || []).filter((comment) => !comment.hidden)
                  const commentDraft = commentDrafts[ticket.id] || ''
                  const isCommentSaving = commentSavingTicketId === ticket.id

                  return (
                    <li
                      key={ticket.id}
                      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                            {ticketLabel(ticket)}
                          </p>
                          <h3 className="mt-2 text-lg font-semibold text-slate-900">
                            {ticket.location || 'Unknown location'}
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {ticket.description || 'No description provided.'}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span
                            className={`rounded-full px-3 py-1 text-sm font-semibold uppercase tracking-wide ${priorityClasses(ticket.priority)}`}
                          >
                            {ticket.priority || '—'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap gap-2">
                          <StatusPill status={ticket.status} />
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold uppercase tracking-wide text-slate-700">
                            {ticket.assignedTo || 'Unassigned'}
                          </span>
                        </div>
                        <div className="text-sm text-slate-500">
                          <time dateTime={ticket.createdAt}>{formatDate(ticket.createdAt)}</time>
                        </div>
                      </div>

                      <div className="mt-4">
                        <TicketWorkflowBar status={ticket.status} rejectReason={ticket.rejectReason} />
                      </div>

                      <div className="mt-4 border-t border-slate-200 pt-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className="m-0 text-sm font-semibold text-slate-900">Comments</p>
                          <span className="text-xs text-slate-500">
                            {visibleComments.length}{' '}
                            {visibleComments.length === 1 ? 'comment' : 'comments'}
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
                                  className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3"
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
                                          onClick={() =>
                                            handleSaveCommentEdit(ticket.id, comment.id)
                                          }
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
                                            onClick={() =>
                                              handleDeleteComment(ticket.id, comment.id)
                                            }
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
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Insights</h2>
            <dl className="mt-5 grid gap-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <dt className="text-sm text-slate-500">Total tickets</dt>
                <dd className="mt-2 text-3xl font-semibold text-slate-900">{tickets.length}</dd>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <dt className="text-sm text-slate-500">Unassigned</dt>
                <dd className="mt-2 text-3xl font-semibold text-slate-900">{counts.unassigned}</dd>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <dt className="text-sm text-slate-500">Active assignments</dt>
                <dd className="mt-2 text-3xl font-semibold text-slate-900">{counts.assigned}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">How to use this page</h2>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <li>Review open and in-progress tickets.</li>
              <li>Read and add comments to coordinate with users and staff.</li>
              <li>Refresh the list after changes to see the latest queue.</li>
            </ol>
          </div>
        </aside>
      </div>
    </section>
  )
}
