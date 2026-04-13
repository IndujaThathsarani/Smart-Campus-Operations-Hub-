import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import TicketWorkflowBar from '../../components/TicketWorkflowBar'
import { apiGet } from '../../services/apiClient'
import './TicketsListPage.css'

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
    <section className="tickets-list-page">
      <header className="tickets-list-header">
        <div>
          <h1 className="page-title">Incident tickets</h1>
          <p className="page-lead">
            List is loaded from the API / MongoDB (not browser storage). Track your reports:{' '}
            <strong>Open</strong> → <strong>In progress</strong> → <strong>Resolved</strong> →{' '}
            <strong>Closed</strong>. An admin may set <strong>Rejected</strong> with a reason instead.
          </p>
        </div>
      </header>

      {loading && (
        <div className="tickets-empty">
          <p>Loading tickets…</p>
        </div>
      )}

      {!loading && error && (
        <div className="tickets-empty" role="alert">
          <p>{error}</p>
          <p>
            <button type="button" className="ticket-retry-btn" onClick={loadTickets}>
              Retry
            </button>
          </p>
        </div>
      )}

      {!loading && !error && tickets.length === 0 && (
        <div className="tickets-empty">
          <p>No tickets in the database yet. Create one with the button below.</p>
        </div>
      )}

      {!loading && !error && tickets.length > 0 && (
        <ul className="tickets-cards">
          {tickets.map((t) => (
            <li key={t.id} className="ticket-card">
              <div className="ticket-card-top">
                <span className="ticket-id" title={t.id}>
                  {t.id}
                </span>
                <div className="ticket-card-badges">
                  <span className="ticket-status-pill">{formatCategory(t.status)}</span>
                  <span className={`ticket-priority ticket-priority--${(t.priority || '').toLowerCase()}`}>
                    {t.priority || '—'}
                  </span>
                </div>
              </div>
              <p className="ticket-meta">
                <span>{formatCategory(t.category)}</span>
                <span className="ticket-meta-sep">·</span>
                <time dateTime={t.createdAt}>{formatDate(t.createdAt)}</time>
              </p>
              <p className="ticket-desc">{excerpt(t.description)}</p>
              <TicketWorkflowBar status={t.status} rejectReason={t.rejectReason} />
            </li>
          ))}
        </ul>
      )}

      <Link
        to="/tickets/new"
        className="tickets-fab"
        title="New incident ticket"
        aria-label="New incident ticket"
      >
        <span className="tickets-fab-icon" aria-hidden>
          +
        </span>
      </Link>
    </section>
  )
}
