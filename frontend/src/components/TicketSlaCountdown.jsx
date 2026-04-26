import { CountdownCircleTimer } from 'react-countdown-circle-timer'
import { SLA_TARGETS_MINUTES, formatDurationMinutes } from './TicketSlaBadges'

const PRIORITY_TIMER_STYLES = {
  URGENT: {
    ringColor: '#dc2626',
    textColor: 'text-red-700',
    labelColor: 'text-red-600',
    glowClass: 'ticket-sla-timer-urgent',
  },
  HIGH: {
    ringColor: '#ea580c',
    textColor: 'text-orange-700',
    labelColor: 'text-orange-600',
    glowClass: 'ticket-sla-timer-high',
  },
  MEDIUM: {
    ringColor: '#2563eb',
    textColor: 'text-blue-700',
    labelColor: 'text-blue-600',
    glowClass: 'ticket-sla-timer-medium',
  },
  LOW: {
    ringColor: '#059669',
    textColor: 'text-emerald-700',
    labelColor: 'text-emerald-600',
    glowClass: 'ticket-sla-timer-low',
  },
  DEFAULT: {
    ringColor: '#64748b',
    textColor: 'text-slate-700',
    labelColor: 'text-slate-500',
    glowClass: 'ticket-sla-timer-default',
  },
  OVERDUE: {
    ringColor: '#e11d48',
    textColor: 'text-rose-700',
    labelColor: 'text-rose-600',
    glowClass: 'ticket-sla-timer-overdue',
  },
  COMPLETE: {
    ringColor: '#0f766e',
    textColor: 'text-teal-700',
    labelColor: 'text-teal-600',
    glowClass: 'ticket-sla-timer-complete',
  },
}

function resolveTimerState({ priority, createdAt, resolvedAt, status, now }) {
  const normalizedPriority = String(priority || '').toUpperCase()
  const targetMinutes = SLA_TARGETS_MINUTES[normalizedPriority]?.resolution
  if (!createdAt || !targetMinutes) {
    return { mode: 'unknown', targetMinutes }
  }

  const startMs = new Date(createdAt).getTime()
  if (Number.isNaN(startMs)) {
    return { mode: 'unknown', targetMinutes }
  }

  if (resolvedAt || ['RESOLVED', 'CLOSED'].includes(String(status || '').toUpperCase())) {
    const endMs = resolvedAt ? new Date(resolvedAt).getTime() : Number.isFinite(now) ? now : Date.now()
    const elapsedMinutes = Math.max(0, (endMs - startMs) / 60000)
    return {
      mode: elapsedMinutes <= targetMinutes ? 'complete' : 'overdue',
      targetMinutes,
      elapsedMinutes,
    }
  }

  const nowMs = Number.isFinite(now) ? now : Date.now()
  const elapsedMinutes = Math.max(0, (nowMs - startMs) / 60000)
  const remainingMinutes = targetMinutes - elapsedMinutes

  if (remainingMinutes <= 0) {
    return {
      mode: 'overdue',
      targetMinutes,
      elapsedMinutes,
      overdueMinutes: Math.abs(remainingMinutes),
    }
  }

  return {
    mode: 'running',
    targetMinutes,
    remainingMinutes,
  }
}

function CompactTime({ remainingTime }) {
  if (remainingTime >= 3600) {
    return `${Math.ceil(remainingTime / 3600)}h`
  }
  if (remainingTime >= 60) {
    return `${Math.ceil(remainingTime / 60)}m`
  }
  return `${Math.max(0, remainingTime)}s`
}

export default function TicketSlaCountdown({
  priority,
  createdAt,
  resolvedAt,
  status,
  now,
  size = 76,
  className = '',
}) {
  const timerState = resolveTimerState({ priority, createdAt, resolvedAt, status, now })
  const normalizedPriority = String(priority || '').toUpperCase()
  const palette = PRIORITY_TIMER_STYLES[normalizedPriority] || PRIORITY_TIMER_STYLES.DEFAULT

  if (timerState.mode === 'unknown') {
    return (
      <div className={`flex flex-col items-center gap-1 text-center ${className}`}>
        <div className="flex h-[76px] w-[76px] items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 shadow-sm">
          N/A
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          SLA timer
        </span>
      </div>
    )
  }

  if (timerState.mode === 'overdue') {
    const overduePalette = PRIORITY_TIMER_STYLES.OVERDUE
    return (
      <div className={`flex flex-col items-center gap-1 text-center ${className}`}>
        <div
          className={`ticket-sla-timer ${overduePalette.glowClass} flex items-center justify-center rounded-full border-4 border-current bg-white ${overduePalette.textColor}`}
          style={{ width: size, height: size }}
          title={`Overdue by ${formatDurationMinutes(timerState.overdueMinutes || timerState.elapsedMinutes - timerState.targetMinutes)}`}
        >
          <div className="flex flex-col leading-none">
            <span className="text-[11px] font-bold uppercase">Late</span>
            <span className="mt-1 text-[10px] font-semibold">
              {formatDurationMinutes(timerState.overdueMinutes || timerState.elapsedMinutes - timerState.targetMinutes)}
            </span>
          </div>
        </div>
        <span className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${overduePalette.labelColor}`}>
          Resolution
        </span>
      </div>
    )
  }

  if (timerState.mode === 'complete') {
    const completePalette = PRIORITY_TIMER_STYLES.COMPLETE
    return (
      <div className={`flex flex-col items-center gap-1 text-center ${className}`}>
        <div
          className={`ticket-sla-timer ${completePalette.glowClass} flex items-center justify-center rounded-full border-4 border-current bg-white ${completePalette.textColor}`}
          style={{ width: size, height: size }}
          title={`Resolved in ${formatDurationMinutes(timerState.elapsedMinutes)}`}
        >
          <div className="flex flex-col leading-none">
            <span className="text-[10px] font-bold uppercase">Done</span>
            <span className="mt-1 text-[10px] font-semibold">
              {formatDurationMinutes(timerState.elapsedMinutes)}
            </span>
          </div>
        </div>
        <span className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${completePalette.labelColor}`}>
          Met SLA
        </span>
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center gap-1 text-center ${className}`}>
      <div className={`ticket-sla-timer ${palette.glowClass}`} title={`${normalizedPriority || 'Default'} priority SLA`}>
        <CountdownCircleTimer
          key={`${normalizedPriority}-${createdAt}-${timerState.targetMinutes}`}
          isPlaying
          duration={timerState.targetMinutes * 60}
          initialRemainingTime={Math.max(0, Math.round(timerState.remainingMinutes * 60))}
          colors={palette.ringColor}
          trailColor="#e2e8f0"
          strokeWidth={7}
          size={size}
          rotation="clockwise"
          updateInterval={60}
        >
          {({ remainingTime }) => (
            <div className="flex flex-col items-center justify-center leading-none">
              <span className={`text-[11px] font-bold uppercase ${palette.labelColor}`}>
                {normalizedPriority || 'SLA'}
              </span>
              <span className={`mt-1 text-sm font-semibold ${palette.textColor}`}>
                <CompactTime remainingTime={remainingTime} />
              </span>
            </div>
          )}
        </CountdownCircleTimer>
      </div>
      <span className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${palette.labelColor}`}>
        Resolution
      </span>
    </div>
  )
}
