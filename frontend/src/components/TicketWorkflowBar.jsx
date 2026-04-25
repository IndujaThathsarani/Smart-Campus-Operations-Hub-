import { AlertCircle, CheckCircle2, ChevronRight, Circle, CircleDot } from 'lucide-react'

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
        <div
          className={`border border-red-200 bg-red-50 ${
            compact ? 'rounded-full px-2.5 py-1' : 'rounded-2xl px-4 py-3'
          }`}
        >
          <span
            className={`inline-flex items-center gap-1 rounded-full bg-red-100 font-semibold text-red-800 ${
              compact ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
            }`}
          >
            <AlertCircle className={compact ? 'h-3 w-3' : 'h-4 w-4'} strokeWidth={2.2} />
            Rejected
          </span>
          {!compact &&
            (rejectReason ? (
              <p className="mt-2 text-sm font-semibold leading-relaxed text-red-900">
                <strong>Reason:</strong> {rejectReason}
              </p>
            ) : (
              <p className="mt-2 text-sm italic leading-relaxed text-gray-600">
                Admin rejection reason will appear here when set.
              </p>
            ))}
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
            <li
              key={step.key}
              className={`flex items-center ${compact ? 'gap-1.5 text-xs sm:text-sm' : 'gap-2 text-sm sm:text-base'}`}
            >
              {isCurrent ? (
                <CircleDot
                  aria-hidden
                  className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4 sm:h-5 sm:w-5'} shrink-0 text-slate-900`}
                  strokeWidth={2.2}
                />
              ) : isDone ? (
                <CheckCircle2
                  aria-hidden
                  className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4 sm:h-5 sm:w-5'} shrink-0 text-emerald-600`}
                  strokeWidth={2.2}
                />
              ) : (
                <Circle
                  aria-hidden
                  className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4 sm:h-5 sm:w-5'} shrink-0 text-gray-300`}
                  strokeWidth={2}
                />
              )}
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
                <ChevronRight
                  className={`${compact ? 'mx-0.5 h-3 w-3' : 'mx-1 h-3.5 w-3.5 sm:h-4 sm:w-4'} text-gray-300`}
                  strokeWidth={2.2}
                />
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
