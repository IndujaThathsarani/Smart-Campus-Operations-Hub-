import './TicketWorkflowBar.css'

const MAIN_STEPS = [
  { key: 'OPEN', label: 'Open' },
  { key: 'IN_PROGRESS', label: 'In progress' },
  { key: 'RESOLVED', label: 'Resolved' },
  { key: 'CLOSED', label: 'Closed' },
]

/**
 * Visualises OPEN → IN_PROGRESS → RESOLVED → CLOSED, or REJECTED (admin) with optional reason.
 */
export default function TicketWorkflowBar({ status, rejectReason }) {
  if (status === 'REJECTED') {
    return (
      <div className="ticket-workflow ticket-workflow--rejected" aria-label="Ticket status">
        <div className="ticket-workflow-rejected">
          <span className="ticket-workflow-badge ticket-workflow-badge--rejected">Rejected</span>
          {rejectReason ? (
            <p className="ticket-workflow-reason">
              <strong>Reason:</strong> {rejectReason}
            </p>
          ) : (
            <p className="ticket-workflow-reason ticket-workflow-reason--muted">
              Admin rejection reason will appear here when set.
            </p>
          )}
        </div>
      </div>
    )
  }

  const idx = MAIN_STEPS.findIndex((s) => s.key === status)
  const activeIndex = idx >= 0 ? idx : 0

  return (
    <div className="ticket-workflow" aria-label="Ticket workflow">
      <ol className="ticket-workflow-steps">
        {MAIN_STEPS.map((step, i) => {
          let state = 'upcoming'
          if (i < activeIndex) state = 'done'
          if (i === activeIndex) state = 'current'
          return (
            <li key={step.key} className={`ticket-workflow-step ticket-workflow-step--${state}`}>
              <span className="ticket-workflow-dot" aria-hidden />
              <span className="ticket-workflow-label">{step.label}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
