const STORAGE_KEY = 'resource-catalogue-items'

const DEFAULT_RESOURCES = [
  {
    id: 'res-1',
    name: 'Lecture Hall A1',
    type: 'CLASSROOM',
    capacity: 120,
    location: 'Building A',
    availabilityStart: '08:00',
    availabilityEnd: '17:00',
    status: 'ACTIVE',
    description: 'Main lecture hall with projector and PA system',
  },
  {
    id: 'res-2',
    name: 'Computer Lab B2',
    type: 'LAB',
    capacity: 40,
    location: 'Building B',
    availabilityStart: '09:00',
    availabilityEnd: '18:00',
    status: 'ACTIVE',
    description: 'Desktop lab for practical classes',
  },
  {
    id: 'res-3',
    name: 'Main Auditorium',
    type: 'AUDITORIUM',
    capacity: 300,
    location: 'Main Campus',
    availabilityStart: '08:00',
    availabilityEnd: '20:00',
    status: 'OUT_OF_SERVICE',
    description: 'Auditorium under maintenance',
  },
]

export const RESOURCE_TYPES = [
  'CLASSROOM',
  'LAB',
  'AUDITORIUM',
  'MEETING_ROOM',
  'OTHER',
]

function readRaw() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function writeRaw(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // Ignore storage write errors in restricted environments.
  }
}

export function getCatalogueResources() {
  const raw = readRaw()
  if (!raw) {
    writeRaw(JSON.stringify(DEFAULT_RESOURCES))
    return [...DEFAULT_RESOURCES]
  }

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : [...DEFAULT_RESOURCES]
  } catch {
    writeRaw(JSON.stringify(DEFAULT_RESOURCES))
    return [...DEFAULT_RESOURCES]
  }
}

export function saveCatalogueResources(resources) {
  writeRaw(JSON.stringify(resources))
}

export function createResourceId() {
  return `res-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}
