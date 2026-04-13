/** Labels for ticket form (values align with typical API enums). */
export const TICKET_CATEGORIES = [
  { value: 'ELECTRICAL', label: 'Electrical' },
  { value: 'PLUMBING', label: 'Plumbing' },
  { value: 'HVAC', label: 'HVAC' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'IT_SOFTWARE', label: 'IT / software' },
  { value: 'STRUCTURAL', label: 'Structural' },
  { value: 'SAFETY', label: 'Safety' },
  { value: 'CLEANING', label: 'Cleaning' },
  { value: 'GENERAL', label: 'General' },
]

export const TICKET_PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
]

/** Demo catalogue entries — replace with API data when wired. */
export const MOCK_CATALOGUE_RESOURCES = [
  { id: 'demo-1', label: 'Lecture Hall 101 — Main projector' },
  { id: 'demo-2', label: 'Lab B — Document camera' },
  { id: 'demo-3', label: 'Meeting room 3 — Smart board' },
]
