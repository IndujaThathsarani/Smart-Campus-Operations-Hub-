import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import TicketWorkflowBar from '../../components/TicketWorkflowBar'
import { apiGet } from '../../services/apiClient'

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

export default function TicketsListPage() {
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
    loadTickets()
  }, [loadTickets])

  return (
    <section className="relative max-w-2xl pb-20">
      <header className="mb-5">
        <h1 className="mb-2 text-2xl font-semibold text-slate-900">Incident tickets</h1>
        <p className="text-sm leading-relaxed text-gray-600">
          List is loaded from the API / MongoDB (not browser storage). Track your reports:{' '}
          <strong>Open</strong> {'->'} <strong>In progress</strong> {'->'} <strong>Resolved</strong> {'->'}{' '}
          <strong>Closed</strong>. An admin may set <strong>Rejected</strong> with a reason instead.
        </p>
      </header>

      {loading && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-5 py-8 text-center text-sm text-gray-500">
          <p>Loading tickets…</p>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-5 py-8 text-center text-sm text-gray-500" role="alert">
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
          <p>No tickets in the database yet. Create one with the button below.</p>
        </div>
      )}

      {!loading && !error && tickets.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-4 p-0">
          {tickets.map((t) => (
            <li key={t.id} className="rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="break-all font-mono text-xs text-gray-500" title={t.id}>
                  {t.id}
                </span>
                <div className="flex flex-wrap justify-end gap-1.5">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                    {formatCategory(t.status)}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${priorityClasses(t.priority)}`}>
                    {t.priority || '—'}
                  </span>
                </div>
              </div>

              <p className="mt-1 text-sm text-gray-500">
                <span>{formatCategory(t.category)}</span>
                <span className="mx-1.5 text-gray-300">·</span>
                <time dateTime={t.createdAt}>{formatDate(t.createdAt)}</time>
              </p>

              <p className="mt-1 text-sm leading-relaxed text-gray-700">{excerpt(t.description)}</p>
              <TicketWorkflowBar status={t.status} rejectReason={t.rejectReason} />
            </li>
          ))}
        </ul>
      )}

      <Link
        to="/tickets/new"
        className="fixed bottom-7 right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition hover:scale-105 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 md:right-10"
        title="New incident ticket"
        aria-label="New incident ticket"
      >
        <span className="-mt-0.5 text-3xl font-light leading-none" aria-hidden>
          +
        </span>
      </Link>
    </section>
  )
}



