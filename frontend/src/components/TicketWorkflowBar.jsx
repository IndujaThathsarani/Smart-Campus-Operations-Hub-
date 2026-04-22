const MAIN_STEPS = [
  { key: 'OPEN', label: 'Open' },
  { key: 'IN_PROGRESS', label: 'In progress' },
  { key: 'RESOLVED', label: 'Resolved' },
  { key: 'CLOSED', label: 'Closed' },
]

export default function TicketWorkflowBar({ status, rejectReason }) {
  if (status === 'REJECTED') {
    return (
      <div className="mt-0" aria-label="Ticket status">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <span className="inline-block rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-800">
            Rejected
          </span>
          {rejectReason ? (
            <p className="mt-2 text-sm leading-relaxed text-red-900">
              <strong>Reason:</strong> {rejectReason}
            </p>
          ) : (
            <p className="mt-2 text-sm italic leading-relaxed text-gray-600">
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
            <li key={step.key} className="flex items-center gap-2 text-sm sm:text-base">
              <span
                aria-hidden
                className={`h-2.5 w-2.5 shrink-0 rounded-full sm:h-3 sm:w-3 ${
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
                <span className="mx-1 text-xs text-gray-300 sm:text-sm">{'->'}</span>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
