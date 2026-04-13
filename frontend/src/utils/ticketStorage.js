const STORAGE_KEY = 'smartcampus_incident_tickets_v1'

/**
 * Persist tickets created in this browser so the list view can show them before a full
 * "my tickets" API exists. Merges with API-shaped objects { id, status, ... }.
 */
export function loadStoredTickets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function upsertStoredTicket(ticket) {
  const list = loadStoredTickets()
  const without = list.filter((t) => t.id !== ticket.id)
  const next = [ticket, ...without]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}
