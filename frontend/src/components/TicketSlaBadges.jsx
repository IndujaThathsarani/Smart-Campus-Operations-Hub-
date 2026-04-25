const SLA_TARGETS_MINUTES = {
  URGENT: { firstResponse: 30, resolution: 4 * 60 },
  HIGH: { firstResponse: 2 * 60, resolution: 24 * 60 },
  MEDIUM: { firstResponse: 4 * 60, resolution: 48 * 60 },
  LOW: { firstResponse: 8 * 60, resolution: 72 * 60 },
}

function formatDurationMinutes(totalMinutes) {
  const mins = Math.max(0, Math.round(totalMinutes))
  const days = Math.floor(mins / 1440)
  const hours = Math.floor((mins % 1440) / 60)
  const minutes = mins % 60
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function toneClasses(tone) {
  switch (tone) {
    case 'good':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'warn':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    case 'bad':
      return 'border-rose-200 bg-rose-50 text-rose-700'
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600'
  }
}

function buildLiveState({ createdAt, targetMinutes, now }) {
  if (!createdAt || !targetMinutes) {
    return { text: 'N/A', tone: 'neutral' }
  }

  const startMs = new Date(createdAt).getTime()
  const nowMs = Number.isFinite(now) ? now : Date.now()
  if (Number.isNaN(startMs) || Number.isNaN(nowMs)) {
    return { text: 'N/A', tone: 'neutral' }
  }

  const elapsedMinutes = (nowMs - startMs) / 60000
  const remaining = targetMinutes - elapsedMinutes

  if (remaining < 0) {
    return {
      text: `Overdue by ${formatDurationMinutes(Math.abs(remaining))}`,
      tone: 'bad',
    }
  }

  if (remaining <= targetMinutes * 0.25) {
    return {
      text: `Due in ${formatDurationMinutes(remaining)}`,
      tone: 'warn',
    }
  }

  return {
    text: `Due in ${formatDurationMinutes(remaining)}`,
    tone: 'good',
  }
}

function buildCompletedState({ createdAt, finishedAt, targetMinutes }) {
  if (!createdAt || !finishedAt || !targetMinutes) {
    return { text: 'N/A', tone: 'neutral' }
  }

  const startMs = new Date(createdAt).getTime()
  const endMs = new Date(finishedAt).getTime()
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return { text: 'N/A', tone: 'neutral' }
  }

  const elapsedMinutes = (endMs - startMs) / 60000
  const onTime = elapsedMinutes <= targetMinutes
  return {
    text: onTime
      ? `Met in ${formatDurationMinutes(elapsedMinutes)}`
      : `Breached in ${formatDurationMinutes(elapsedMinutes)}`,
    tone: onTime ? 'good' : 'bad',
  }
}

function buildResolutionState({ createdAt, resolvedAt, status, targetMinutes, now }) {
  if ((status || '').toUpperCase() === 'REJECTED' && !resolvedAt) {
    return { text: 'Rejected', tone: 'neutral' }
  }
  if (resolvedAt) {
    return buildCompletedState({ createdAt, finishedAt: resolvedAt, targetMinutes })
  }
  return buildLiveState({ createdAt, targetMinutes, now })
}

function buildFirstResponseState({ createdAt, firstResponseAt, targetMinutes, now }) {
  if (firstResponseAt) {
    return buildCompletedState({ createdAt, finishedAt: firstResponseAt, targetMinutes })
  }
  return buildLiveState({ createdAt, targetMinutes, now })
}

export default function TicketSlaBadges({
  priority,
  createdAt,
  firstResponseAt,
  resolvedAt,
  status,
  now,
  className = '',
}) {
  const target = SLA_TARGETS_MINUTES[String(priority || '').toUpperCase()]

  const firstResponse = buildFirstResponseState({
    createdAt,
    firstResponseAt,
    targetMinutes: target?.firstResponse,
    now,
  })

  const resolution = buildResolutionState({
    createdAt,
    resolvedAt,
    status,
    targetMinutes: target?.resolution,
    now,
  })

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${toneClasses(firstResponse.tone)}`}
        title="Time to first response"
      >
        First response: {firstResponse.text}
      </span>
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${toneClasses(resolution.tone)}`}
        title="Time to resolution"
      >
        Resolution: {resolution.text}
      </span>
    </div>
  )
}
