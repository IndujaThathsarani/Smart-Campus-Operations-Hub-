const MAIN_STEPS = [
  { key: 'OPEN', label: 'Open' },
  { key: 'IN_PROGRESS', label: 'In progress' },
  { key: 'RESOLVED', label: 'Resolved' },
  { key: 'CLOSED', label: 'Closed' },
]

export default function TicketWorkflowBar({ status, rejectReason, compact = false }) {
  if (status === 'REJECTED') {
    return (
      <div className="mt-0" aria-label="Ticket status">
        <div className={`rounded-md border border-red-200 bg-red-50 ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}>
          <span className={`inline-block rounded-full bg-red-100 font-semibold text-red-800 ${compact ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}`}>
            Rejected
          </span>
          {rejectReason ? (
            <p className={`${compact ? 'mt-1 text-xs leading-5' : 'mt-2 text-sm leading-relaxed'} text-red-900`}>
              <strong>Reason:</strong> {rejectReason}
            </p>
          ) : (
            <p className={`${compact ? 'mt-1 text-xs leading-5' : 'mt-2 text-sm leading-relaxed'} italic text-gray-600`}>
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
    <div className="mt-0" aria-label="Ticket workflow">
      <ol className="m-0 flex list-none flex-wrap items-center gap-x-1 gap-y-2 p-0">
        {MAIN_STEPS.map((step, i) => {
          const isDone = i < activeIndex
          const isCurrent = i === activeIndex
          return (
            <li key={step.key} className={`flex items-center ${compact ? 'gap-1.5 text-xs sm:text-sm' : 'gap-2 text-sm sm:text-base'}`}>
              <span
                aria-hidden
                className={`${compact ? 'h-2 w-2' : 'h-2.5 w-2.5 sm:h-3 sm:w-3'} shrink-0 rounded-full ${
                  isCurrent
                    ? 'bg-slate-900 ring-2 ring-slate-300'
                    : isDone
                      ? 'bg-emerald-500 ring-1 ring-emerald-100'
                      : 'bg-gray-200'
                }`}
              />
              <span
                className={`${
                  isCurrent
                    ? 'font-semibold text-slate-900'
                    : isDone
                      ? 'font-medium text-emerald-700'
                      : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
              {i < MAIN_STEPS.length - 1 && (
                <span className={`${compact ? 'mx-0.5 text-xs' : 'mx-1 text-xs sm:text-sm'} text-gray-300`}>{'->'}</span>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
