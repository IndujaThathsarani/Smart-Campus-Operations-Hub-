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

function displayTicketNumber(ticket) {
  return ticket?.ticketNumber || ticket?.id || '—'
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
          <p>No tickets in the database yet. Use <strong>+create incident ticket</strong> above.</p>
        </div>
      )}

      {!loading && !error && tickets.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {tickets.map((t) => (
            <li key={t.id} className="rounded-md border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span
                    className="block break-all font-mono text-sm font-medium text-slate-700"
                    title={t.id}
                  >
                    {displayTicketNumber(t)}
                  </span>
                  <div className="mt-2">
                    <TicketWorkflowBar status={t.status} rejectReason={t.rejectReason} compact />
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase text-slate-700">
                    {formatCategory(t.status)}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${priorityClasses(t.priority)}`}
                  >
                    {t.priority || '—'}
                  </span>
                </div>
              </div>

              <p className="mt-3 text-sm text-gray-600">
                <span>{formatCategory(t.category)}</span>
                <span className="mx-2 text-gray-300">·</span>
                <time dateTime={t.createdAt}>{formatDate(t.createdAt)}</time>
              </p>
              <p className="mt-1 break-all font-mono text-xs text-gray-500">
                Resource: {t.resourceId || 'Not linked'}
              </p>

              <p className="mt-2 text-sm leading-6 text-gray-800">{excerpt(t.description, 100)}</p>
            </li>
          ))}
        </ul>
      )}

    </section>
  )
}



