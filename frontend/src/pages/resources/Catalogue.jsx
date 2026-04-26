import { useEffect, useMemo, useState } from 'react'
import { Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import TicketParticlesBackground from '../../components/TicketParticlesBackground'
import { apiSend } from '../../services/apiClient'

const CALENDAR_WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const FAVOURITES_STORAGE_KEY = 'smart-campus:favourite-resources'
const RECENTLY_VIEWED_STORAGE_KEY = 'smart-campus:recently-viewed-resources'

function loadStoredIds(storageKey) {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(storageKey)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : []
  } catch {
    return []
  }
}

function getStatusMeta(status) {
  if (status === 'ACTIVE') {
    return { label: 'Active', color: '#16a34a' }
  }
  if (status === 'OUT_OF_SERVICE') {
    return { label: 'Out of service', color: '#dc2626' }
  }
  return { label: status || 'Unknown', color: '#6b7280' }
}

function formatDisplayDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const CATEGORY_META = {
  LECTURE_HALL: { label: 'Lecture Hall', icon: '🏛️' },
  CLASSROOM: { label: 'Lecture Hall', icon: '🏛️' },
  LABORATORY: { label: 'Laboratory', icon: '🔬' },
  LAB: { label: 'Laboratory', icon: '🔬' },
  AUDITORIUM: { label: 'Auditorium', icon: '🎤' },
  MEETING_ROOM: { label: 'Meeting Room', icon: '💼' },
  SEMINAR_ROOM: { label: 'Seminar Room', icon: '🗣️' },
  EQUIPMENT: { label: 'Equipment', icon: '📷' },
  TRAINING_ROOM: { label: 'Training Room', icon: '🏫' },
  WORKSHOP_AREA: { label: 'Workshop Area', icon: '🛠️' },
  STUDIO: { label: 'Studio', icon: '🎬' },
  LIBRARY_SPACE: { label: 'Library Space', icon: '📚' },
  OTHER: { label: 'Other', icon: '📦' },
}

const DEFAULT_CATEGORY_IDS = [
  'LECTURE_HALL',
  'LABORATORY',
  'MEETING_ROOM',
  'AUDITORIUM',
  'SEMINAR_ROOM',
  'EQUIPMENT',
  'TRAINING_ROOM',
  'WORKSHOP_AREA',
  'STUDIO',
  'LIBRARY_SPACE',
  'OTHER',
]

function formatTypeLabel(type) {
  return String(type || 'OTHER').replace(/_/g, ' ')
}

function getCategoryMeta(type) {
  const base = CATEGORY_META[type] || { label: formatTypeLabel(type), icon: '📦' }
  return {
    id: type,
    label: base.label,
    icon: base.icon,
  }
}

function normalizeTypeKey(type) {
  if (type === 'CLASSROOM') return 'LECTURE_HALL'
  if (type === 'LAB') return 'LABORATORY'
  return type
}

function matchesCategory(resourceType, categoryId) {
  if (categoryId === 'LECTURE_HALL' || categoryId === 'CLASSROOM') {
    return resourceType === 'CLASSROOM' || resourceType === 'LECTURE_HALL'
  }

  if (categoryId === 'LABORATORY' || categoryId === 'LAB') {
    return resourceType === 'LABORATORY' || resourceType === 'LAB'
  }

  return resourceType === categoryId
}

function getEquipmentImage(resource) {
  if (!resource || resource.type !== 'EQUIPMENT') return ''
  return typeof resource.equipmentImage === 'string' ? resource.equipmentImage : ''
}

function toDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatTimeLabel(date) {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function parseTimeValue(timeValue) {
  if (!timeValue || typeof timeValue !== 'string') return null

  const [hourText, minuteText] = timeValue.split(':')
  const hours = Number(hourText)
  const minutes = Number(minuteText)

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null

  return { hours, minutes }
}

function createDateTime(date, timeValue) {
  const parsed = parseTimeValue(timeValue)
  if (!parsed) return null

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    parsed.hours,
    parsed.minutes,
    0,
    0,
  )
}

function normalizeIdentifier(value) {
  if (value === null || value === undefined) return ''
  return String(value).trim().toLowerCase()
}

function getResourceBookings(bookings, resource) {
  if (!resource) return []

  const validResourceIdentifiers = new Set([
    normalizeIdentifier(resource.id),
    normalizeIdentifier(resource.name),
  ])

  validResourceIdentifiers.delete('')
  if (validResourceIdentifiers.size === 0) return []

  return bookings.filter((booking) => {
    const bookingResourceIdentifier = normalizeIdentifier(booking.resourceId)
    if (!validResourceIdentifiers.has(bookingResourceIdentifier)) return false
    return booking.status !== 'REJECTED' && booking.status !== 'CANCELLED'
  })
}

function getBookingDateMap(bookings, resource) {
  const bookingDateMap = new Map()

  getResourceBookings(bookings, resource).forEach((booking) => {
    const start = new Date(booking.startTime)
    const end = new Date(booking.endTime)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return

    const current = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    const last = new Date(end.getFullYear(), end.getMonth(), end.getDate())

    while (current <= last) {
      const dayStart = new Date(current.getFullYear(), current.getMonth(), current.getDate(), 0, 0, 0, 0)
      const nextDayStart = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1, 0, 0, 0, 0)
      const slotStart = new Date(Math.max(start.getTime(), dayStart.getTime()))
      const slotEnd = new Date(Math.min(end.getTime(), nextDayStart.getTime()))

      if (slotStart < slotEnd) {
        const dateKey = toDateKey(current)
        const existing = bookingDateMap.get(dateKey) || []
        existing.push({
          id: booking.id,
          status: booking.status,
          start: slotStart,
          end: slotEnd,
        })
        bookingDateMap.set(dateKey, existing)
      }

      current.setDate(current.getDate() + 1)
    }
  })

  bookingDateMap.forEach((slots, dateKey) => {
    bookingDateMap.set(
      dateKey,
      [...slots].sort((left, right) => left.start.getTime() - right.start.getTime()),
    )
  })

  return bookingDateMap
}

function getResourceRangeDateKeys(resource) {
  if (!resource || !resource.availabilityStartDate || !resource.availabilityEndDate) {
    return new Set()
  }

  const start = new Date(resource.availabilityStartDate)
  const end = new Date(resource.availabilityEndDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return new Set()

  const current = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  const dateKeys = new Set()

  while (current <= last) {
    dateKeys.add(toDateKey(current))
    current.setDate(current.getDate() + 1)
  }

  return dateKeys
}

function isDateWithinResourceRange(resource, date) {
  if (!resource || !resource.availabilityStartDate || !resource.availabilityEndDate) {
    return true
  }

  const start = new Date(resource.availabilityStartDate)
  const end = new Date(resource.availabilityEndDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return true

  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const rangeStart = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const rangeEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate())

  return target >= rangeStart && target <= rangeEnd
}

function getAvailabilityWindow(resource, date) {
  if (!resource || !isDateWithinResourceRange(resource, date)) return null
  if (!resource.availabilityStart || !resource.availabilityEnd) return null

  const start = createDateTime(date, resource.availabilityStart)
  const end = createDateTime(date, resource.availabilityEnd)

  if (!start || !end || start >= end) return null

  return { start, end }
}

function getAvailableTimeSlots(bookedSlots, availabilityWindow) {
  if (!availabilityWindow) return []

  const freeSlots = []
  let cursor = availabilityWindow.start

  bookedSlots.forEach((slot) => {
    const boundedStart = new Date(Math.max(slot.start.getTime(), availabilityWindow.start.getTime()))
    const boundedEnd = new Date(Math.min(slot.end.getTime(), availabilityWindow.end.getTime()))

    if (boundedStart >= boundedEnd) return

    if (cursor < boundedStart) {
      freeSlots.push({ start: new Date(cursor), end: boundedStart })
    }

    if (cursor < boundedEnd) {
      cursor = boundedEnd
    }
  })

  if (cursor < availabilityWindow.end) {
    freeSlots.push({ start: new Date(cursor), end: availabilityWindow.end })
  }

  return freeSlots
}

function splitIntoHourlySlots(freeSlots, minutesPerSlot = 60) {
  const slots = []
  const slotMs = minutesPerSlot * 60 * 1000

  freeSlots.forEach((slot) => {
    let cursor = new Date(slot.start)
    const end = new Date(slot.end)

    while (cursor.getTime() + slotMs <= end.getTime()) {
      const next = new Date(cursor.getTime() + slotMs)
      slots.push({ start: new Date(cursor), end: next })
      cursor = next
    }
  })

  return slots
}

function getDayAvailabilityState(resource, date, bookingDateMap) {
  if (!resource || !date) return 'unknown'
  if (!isDateWithinResourceRange(resource, date)) return 'out-of-range'

  const dateKey = toDateKey(date)
  const dayBookings = bookingDateMap.get(dateKey) || []
  const window = getAvailabilityWindow(resource, date)

  if (!window) {
    return dayBookings.length > 0 ? 'booked-only' : 'unknown'
  }

  const freeRanges = getAvailableTimeSlots(dayBookings, window)

  if (dayBookings.length === 0) return 'fully-available'
  if (freeRanges.length === 0) return 'fully-booked'
  return 'partially-booked'
}

export default function Catalogue() {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('LECTURE_HALL')
  const [resources, setResources] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCalendarResourceId, setSelectedCalendarResourceId] = useState('')
  const [selectedCalendarDateKey, setSelectedCalendarDateKey] = useState('')
  const [selectedSlotKey, setSelectedSlotKey] = useState('')
  const [bookingInProgress, setBookingInProgress] = useState(false)
  const [bookingFeedback, setBookingFeedback] = useState(null)
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [filters, setFilters] = useState({
    location: '',
    minCapacity: '',
    status: 'ACTIVE',
  })
  const [viewMode, setViewMode] = useState('ALL')
  const [favoriteResourceIds, setFavoriteResourceIds] = useState(() => loadStoredIds(FAVOURITES_STORAGE_KEY))
  const [recentlyViewedResourceIds, setRecentlyViewedResourceIds] = useState(() =>
    loadStoredIds(RECENTLY_VIEWED_STORAGE_KEY),
  )
  const [favouritePulseResourceId, setFavouritePulseResourceId] = useState('')

  const favouriteResourceIdSet = useMemo(() => {
    return new Set(favoriteResourceIds)
  }, [favoriteResourceIds])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(FAVOURITES_STORAGE_KEY, JSON.stringify(favoriteResourceIds))
  }, [favoriteResourceIds])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(RECENTLY_VIEWED_STORAGE_KEY, JSON.stringify(recentlyViewedResourceIds))
  }, [recentlyViewedResourceIds])

  function toggleFavourite(resourceId) {
    if (!resourceId) return

    setFavoriteResourceIds((prev) => {
      const id = String(resourceId)
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id)
      }
      return [id, ...prev]
    })

    setFavouritePulseResourceId(String(resourceId))
    window.setTimeout(() => {
      setFavouritePulseResourceId((current) => (current === String(resourceId) ? '' : current))
    }, 220)
  }

  function markRecentlyViewed(resourceId) {
    if (!resourceId) return
    const id = String(resourceId)
    setRecentlyViewedResourceIds((prev) => {
      const next = [id, ...prev.filter((value) => value !== id)]
      return next.slice(0, 6)
    })
  }

  useEffect(() => {
    fetchResources()
    fetchBookings()
  }, [])

  async function fetchResources() {
    setLoading(true)
    try {
      const data = await apiSend('/api/resources')
      setResources(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load resources:', err)
      setResources([])
    } finally {
      setLoading(false)
    }
  }

  async function fetchBookings() {
    try {
      const data = await apiSend('/api/bookings')
      setBookings(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load bookings:', err)
      setBookings([])
    }
  }

  // Filter by selected category + other filters
  const filteredResources = useMemo(() => {
    let next = resources.filter((resource) => {
      // Category filter
      const categoryMatch = matchesCategory(resource.type, activeCategory)
      // Location filter
      const locationMatch = !filters.location ||
        resource.location.toLowerCase().includes(filters.location.toLowerCase())
      // Capacity filter
      const capacityFilter = Number(filters.minCapacity)
      const capacityMatch = !filters.minCapacity ||
        (!Number.isNaN(capacityFilter) && resource.capacity >= capacityFilter)
      // Status filter
      const statusMatch = !filters.status || resource.status === filters.status

      return categoryMatch && locationMatch && capacityMatch && statusMatch
    })

    if (viewMode === 'FAVOURITES') {
      next = next.filter((resource) => favouriteResourceIdSet.has(String(resource.id)))
    }

    if (viewMode === 'AVAILABLE') {
      next = next.filter((resource) => resource.status === 'ACTIVE')
    }

    if (viewMode === 'CAPACITY') {
      next = [...next].sort((left, right) => {
        const leftCapacity = Number(left.capacity) || 0
        const rightCapacity = Number(right.capacity) || 0
        return rightCapacity - leftCapacity
      })
    }

    return next
  }, [resources, activeCategory, filters, viewMode, favouriteResourceIdSet])

  const favouriteCount = useMemo(() => {
    return resources.filter((resource) => favouriteResourceIdSet.has(String(resource.id))).length
  }, [resources, favouriteResourceIdSet])

  const recentlyViewedResources = useMemo(() => {
    return recentlyViewedResourceIds
      .map((id) => resources.find((resource) => String(resource.id) === String(id)))
      .filter(Boolean)
  }, [recentlyViewedResourceIds, resources])

  const resourceCategories = useMemo(() => {
    const presentTypes = new Set(
      resources.map((resource) => normalizeTypeKey(resource.type)).filter(Boolean),
    )
    const orderedTypes = [
      ...DEFAULT_CATEGORY_IDS,
      ...Array.from(presentTypes).filter((type) => !DEFAULT_CATEGORY_IDS.includes(type)),
    ]

    const deduped = []
    const seen = new Set()
    for (const type of orderedTypes) {
      if (seen.has(type)) continue
      seen.add(type)
      deduped.push(getCategoryMeta(type))
    }

    return deduped
  }, [resources])

  // Count resources by category
  const categoryCounts = useMemo(() => {
    const counts = {}
    resourceCategories.forEach((cat) => {
      counts[cat.id] = resources.filter((resource) => matchesCategory(resource.type, cat.id)).length
    })
    return counts
  }, [resources, resourceCategories])

  useEffect(() => {
    if (resourceCategories.length === 0) return
    const exists = resourceCategories.some((category) => category.id === activeCategory)
    if (!exists) {
      setActiveCategory(resourceCategories[0].id)
    }
  }, [activeCategory, resourceCategories])

  useEffect(() => {
    if (filteredResources.length === 0) {
      setSelectedCalendarResourceId('')
      return
    }

    const stillExists = filteredResources.some((resource) => resource.id === selectedCalendarResourceId)
    if (!stillExists) {
      setSelectedCalendarResourceId(filteredResources[0].id)
    }
  }, [filteredResources, selectedCalendarResourceId])

  useEffect(() => {
    if (!selectedCalendarResourceId) return
    markRecentlyViewed(selectedCalendarResourceId)
  }, [selectedCalendarResourceId])

  function focusResource(resource) {
    if (!resource) return
    const type = normalizeTypeKey(resource.type)
    if (type) {
      setActiveCategory(type)
    }
    setSelectedCalendarResourceId(resource.id)
    markRecentlyViewed(resource.id)
  }

  const selectedCalendarResource = useMemo(() => {
    return filteredResources.find((resource) => resource.id === selectedCalendarResourceId) || null
  }, [filteredResources, selectedCalendarResourceId])

  const bookingDateMap = useMemo(() => {
    return getBookingDateMap(bookings, selectedCalendarResource)
  }, [bookings, selectedCalendarResource])

  const bookedDateKeys = useMemo(() => {
    return new Set(bookingDateMap.keys())
  }, [bookingDateMap])

  const resourceRangeDateKeys = useMemo(() => {
    return getResourceRangeDateKeys(selectedCalendarResource)
  }, [selectedCalendarResource])

  const calendarCells = useMemo(() => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const leadingEmptyCells = firstDay.getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const cells = []
    for (let i = 0; i < leadingEmptyCells; i += 1) {
      cells.push(null)
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(year, month, day))
    }
    while (cells.length % 7 !== 0) {
      cells.push(null)
    }

    return cells
  }, [calendarMonth])

  useEffect(() => {
    if (!selectedCalendarResource) {
      setSelectedCalendarDateKey('')
      return
    }

    const currentSelection = selectedCalendarDateKey
      ? new Date(`${selectedCalendarDateKey}T00:00:00`)
      : null

    if (currentSelection && isDateWithinResourceRange(selectedCalendarResource, currentSelection)) {
      return
    }

    const today = new Date()
    const todayAtMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())

    const rangeStart = selectedCalendarResource.availabilityStartDate
      ? new Date(`${selectedCalendarResource.availabilityStartDate}T00:00:00`)
      : null
    const rangeEnd = selectedCalendarResource.availabilityEndDate
      ? new Date(`${selectedCalendarResource.availabilityEndDate}T00:00:00`)
      : null

    if (
      rangeStart &&
      rangeEnd &&
      !Number.isNaN(rangeStart.getTime()) &&
      !Number.isNaN(rangeEnd.getTime())
    ) {
      const nextValidDate = todayAtMidnight > rangeStart ? todayAtMidnight : rangeStart
      if (nextValidDate <= rangeEnd) {
        setSelectedCalendarDateKey(toDateKey(nextValidDate))
        return
      }
    }

    if (isDateWithinResourceRange(selectedCalendarResource, todayAtMidnight)) {
      setSelectedCalendarDateKey(toDateKey(todayAtMidnight))
      return
    }

    if (selectedCalendarResource.availabilityStartDate) {
      setSelectedCalendarDateKey(selectedCalendarResource.availabilityStartDate)
      return
    }

    setSelectedCalendarDateKey(toDateKey(todayAtMidnight))
  }, [selectedCalendarDateKey, selectedCalendarResource])

  const selectedCalendarDate = useMemo(() => {
    if (!selectedCalendarDateKey) return null
    const date = new Date(`${selectedCalendarDateKey}T00:00:00`)
    return Number.isNaN(date.getTime()) ? null : date
  }, [selectedCalendarDateKey])

  const selectedDateBookedSlots = useMemo(() => {
    return bookingDateMap.get(selectedCalendarDateKey) || []
  }, [bookingDateMap, selectedCalendarDateKey])

  const selectedDateAvailabilityWindow = useMemo(() => {
    if (!selectedCalendarDate || !selectedCalendarResource) return null
    return getAvailabilityWindow(selectedCalendarResource, selectedCalendarDate)
  }, [selectedCalendarDate, selectedCalendarResource])

  const selectedDateAvailableSlots = useMemo(() => {
    return getAvailableTimeSlots(selectedDateBookedSlots, selectedDateAvailabilityWindow)
  }, [selectedDateBookedSlots, selectedDateAvailabilityWindow])

  const selectedDateBookableSlots = useMemo(() => {
    const now = new Date()
    const hourlySlots = splitIntoHourlySlots(selectedDateAvailableSlots)

    return hourlySlots.filter((slot) => slot.end.getTime() > now.getTime())
  }, [selectedDateAvailableSlots])

  useEffect(() => {
    if (selectedDateBookableSlots.length === 0) {
      setSelectedSlotKey('')
      return
    }

    const selectedStillExists = selectedDateBookableSlots.some(
      (slot) => `${slot.start.toISOString()}|${slot.end.toISOString()}` === selectedSlotKey,
    )

    if (!selectedStillExists) {
      const first = selectedDateBookableSlots[0]
      setSelectedSlotKey(`${first.start.toISOString()}|${first.end.toISOString()}`)
    }
  }, [selectedDateBookableSlots, selectedSlotKey])

  useEffect(() => {
    setBookingFeedback(null)
  }, [selectedCalendarResourceId, selectedCalendarDateKey])

  async function handleBookSelectedSlot() {
    if (!selectedCalendarResource || !selectedSlotKey) return

    const [startIso, endIso] = selectedSlotKey.split('|')
    if (!startIso || !endIso) return

    setBookingInProgress(true)
    setBookingFeedback(null)

    try {
      await apiSend('/api/bookings', {
        method: 'POST',
        body: {
          resourceId: selectedCalendarResource.id,
          location: selectedCalendarResource.location || '',
          startTime: startIso,
          endTime: endIso,
          purpose: `Booking for ${selectedCalendarResource.name || 'resource'} via catalogue`,
          expectedAttendees: 1,
          waitlistRequested: false,
        },
      })

      setBookingFeedback({
        type: 'success',
        text: `Booking confirmed for ${selectedCalendarDateKey} (${formatTimeLabel(new Date(startIso))} - ${formatTimeLabel(new Date(endIso))}).`,
      })
      await fetchBookings()
    } catch (err) {
      const message =
        err?.body?.error === 'CONFLICT'
          ? 'That slot was just booked by another user. Please choose another available slot.'
          : err?.body?.message || 'Failed to create booking for the selected slot.'
      setBookingFeedback({ type: 'error', text: message })
      await fetchBookings()
    } finally {
      setBookingInProgress(false)
    }
  }

  const showEquipmentImageColumn = activeCategory === 'EQUIPMENT'

  return (
    <div
      className="relative isolate w-full min-w-0 overflow-hidden"
      style={{
        display: 'flex',
        minHeight: 'calc(100vh - 4rem)',
        backgroundColor: '#f3f4f6',
        width: '100%',
        overflowX: 'hidden',
        position: 'relative',
      }}
    >
      <TicketParticlesBackground />

      {/* SIDEBAR - Like eProduct Dashboard */}
      <aside className="ticket-enter" style={{
        width: '280px',
        backgroundColor: '#1e293b',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        alignSelf: 'flex-start',
        height: 'calc(100vh - 4rem)',
        overflowY: 'auto',
        zIndex: 1,
        animationDelay: '40ms',
      }}>
        {/* Logo / Brand */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #334155' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>
            🏫 Smart Campus
          </h2>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.25rem 0 0' }}>
            Operations Hub
          </p>
        </div>

        {/* Navigation Menu */}
        <nav style={{ flex: 1, padding: '1rem 0' }}>
          {/* Dashboard (Active) */}
          <div style={{ padding: '0.5rem 1.5rem', backgroundColor: '#334155', margin: '0 0.5rem', borderRadius: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span>📊</span> Dashboard
            </span>
          </div>

          {/* Resource Categories - Like "Order" section in eProduct */}
          <div style={{ marginTop: '1rem' }}>
            <div style={{ padding: '0.5rem 1.5rem', color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              RESOURCES
            </div>
            {resourceCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: 'calc(100% - 1rem)',
                  margin: '0.25rem 0.5rem',
                  padding: '0.6rem 1rem',
                  backgroundColor: activeCategory === category.id ? '#3b82f6' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  color: activeCategory === category.id ? '#fff' : '#cbd5e1',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '0.875rem'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span>{category.icon}</span> {category.label}
                </span>
                <span style={{
                  backgroundColor: activeCategory === category.id ? 'rgba(255,255,255,0.2)' : '#334155',
                  padding: '0.125rem 0.5rem',
                  borderRadius: '20px',
                  fontSize: '0.7rem'
                }}>
                  {categoryCounts[category.id] || 0}
                </span>
              </button>
            ))}
          </div>

          {/* Bottom Menu Items */}
          <div style={{ marginTop: '2rem' }}>
            <div style={{ padding: '0.5rem 1.5rem', color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase' }}>
              MANAGEMENT
            </div>
          </div>
        </nav>

        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #334155', fontSize: '0.7rem', color: '#64748b' }}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
            <span>f</span> <span>🐦</span> <span>📧</span>
          </div>
          <div>© 2026 Smart Campus</div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="ticket-enter" style={{ flex: 1, minWidth: 0, padding: '1.5rem', position: 'relative', zIndex: 1, animationDelay: '120ms' }}>
        {/* Header with active category */}
        <div className="ticket-enter" style={{ marginBottom: '1.5rem', animationDelay: '180ms' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
            {resourceCategories.find((category) => category.id === activeCategory)?.label || 'Resources'}
          </h1>
          <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>
            {categoryCounts[activeCategory] || 0} resources available
          </p>
          <p style={{ color: '#64748b', marginTop: '0.35rem', fontSize: '0.85rem' }}>
            {favouriteCount} favourites saved
          </p>
        </div>

        {/* Stats Cards - Like eProduct order summary */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div className="ticket-enter" style={{ background: '#fff', padding: '1rem', borderRadius: '10px', border: '1px solid #e5e7eb', animationDelay: '220ms' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total Resources</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{resources.length}</div>
          </div>
          <div className="ticket-enter" style={{ background: '#fff', padding: '1rem', borderRadius: '10px', border: '1px solid #e5e7eb', animationDelay: '280ms' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Active</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#16a34a' }}>{resources.filter(r => r.status === 'ACTIVE').length}</div>
          </div>
          <div className="ticket-enter" style={{ background: '#fff', padding: '1rem', borderRadius: '10px', border: '1px solid #e5e7eb', animationDelay: '340ms' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Out of Service</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc2626' }}>{resources.filter(r => r.status === 'OUT_OF_SERVICE').length}</div>
          </div>
          <div className="ticket-enter" style={{ background: '#fff', padding: '1rem', borderRadius: '10px', border: '1px solid #e5e7eb', animationDelay: '400ms' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Categories</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{resourceCategories.length}</div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="ticket-enter" style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '10px',
          padding: '1rem',
          marginBottom: '1rem',
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          animationDelay: '460ms',
        }}>
          <input
            type="text"
            placeholder="Search location..."
            value={filters.location}
            onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
            style={{ flex: 1, padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
          />
          <input
            type="number"
            placeholder="Min capacity"
            value={filters.minCapacity}
            onChange={(e) => setFilters((f) => ({ ...f, minCapacity: e.target.value }))}
            style={{ width: '120px', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="OUT_OF_SERVICE">Out of service</option>
          </select>
          <button
            onClick={() => setFilters({ location: '', minCapacity: '', status: '' })}
            style={{ padding: '0.5rem 1rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}
          >
            Reset
          </button>

          <div style={{ display: 'inline-flex', gap: '0.35rem', marginLeft: 'auto' }}>
            {[
              { id: 'ALL', label: 'All' },
              { id: 'FAVOURITES', label: 'Favourites' },
              { id: 'AVAILABLE', label: 'Available' },
              { id: 'CAPACITY', label: 'Capacity' },
            ].map((mode) => {
              const isActive = viewMode === mode.id
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setViewMode(mode.id)}
                  style={{
                    padding: '0.45rem 0.7rem',
                    borderRadius: '999px',
                    border: isActive ? '1px solid #0f172a' : '1px solid #d1d5db',
                    background: isActive ? '#0f172a' : '#fff',
                    color: isActive ? '#fff' : '#334155',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {mode.label}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 300px',
          gap: '1rem',
          alignItems: 'start'
        }}>
          {/* Resources Table - Like eProduct orders table */}
          <div className="ticket-enter" style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            overflowX: 'auto',
            animationDelay: '520ms',
          }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>Loading resources...</div>
            ) : (
              <table
                style={{
                  width: '100%',
                  minWidth: showEquipmentImageColumn ? '64rem' : '58rem',
                  borderCollapse: 'collapse',
                }}
              >
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>ID</th>
                    {showEquipmentImageColumn ? (
                      <th style={{ textAlign: 'left', padding: '0.75rem' }}>Image</th>
                    ) : null}
                    <th style={{ textAlign: 'center', padding: '0.75rem', width: '64px' }}>★</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Name</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Location</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Capacity</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Date</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Time</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Status</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResources.map((resource, idx) => {
                    const isFavourite = favouriteResourceIdSet.has(String(resource.id))
                    const isPulsing = favouritePulseResourceId === String(resource.id)

                    return (
                      <tr
                        key={resource.id}
                        className="ticket-enter"
                        onClick={() => focusResource(resource)}
                        style={{
                          borderTop: '1px solid #e5e7eb',
                          animationDelay: `${idx * 45}ms`,
                          background: '#fff',
                          transition: 'background 0.2s ease',
                          cursor: 'pointer',
                        }}
                      >
                        <td style={{ padding: '0.75rem', color: '#6b7280' }}>#{idx + 1}</td>
                        {showEquipmentImageColumn ? (
                          <td style={{ padding: '0.75rem' }}>
                            {getEquipmentImage(resource) ? (
                              <img
                                src={getEquipmentImage(resource)}
                                alt={`${resource.name || 'Equipment'} thumbnail`}
                                style={{
                                  width: '48px',
                                  height: '48px',
                                  borderRadius: '10px',
                                  objectFit: 'cover',
                                  border: '1px solid #dbe4f0',
                                  background: '#f8fafc',
                                  display: 'block',
                                }}
                              />
                            ) : (
                              <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '10px',
                                border: '1px dashed #cbd5e1',
                                background: '#f8fafc',
                                color: '#94a3b8',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.65rem',
                                lineHeight: 1,
                                textAlign: 'center',
                              }}>
                                No
                                <br />
                                image
                              </div>
                            )}
                          </td>
                        ) : null}
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              toggleFavourite(resource.id)
                            }}
                            aria-label={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
                            title={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: '#111827',
                              width: 'auto',
                              height: 'auto',
                              borderRadius: 0,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '0.1rem',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              transform: isPulsing ? 'scale(1.18) rotate(-8deg)' : 'scale(1)',
                              boxShadow: 'none',
                            }}
                          >
                            <Star
                              size={20}
                              strokeWidth={1.7}
                              style={{
                                stroke: '#111827',
                                fill: isFavourite ? '#facc15' : 'transparent',
                                transition: 'fill 0.2s ease, transform 0.2s ease',
                                transform: isFavourite ? 'scale(1.03)' : 'scale(1)',
                              }}
                            />
                          </button>
                        </td>
                        <td style={{ padding: '0.75rem', fontWeight: '500' }}>{resource.name}</td>
                        <td style={{ padding: '0.75rem' }}>{resource.location}</td>
                        <td style={{ padding: '0.75rem' }}>{resource.capacity}</td>
                        <td style={{ padding: '0.75rem', fontSize: '0.8rem' }}>
                          {resource.availabilityStartDate && resource.availabilityEndDate
                            ? `${resource.availabilityStartDate} - ${resource.availabilityEndDate}`
                            : 'Not set'}
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.8rem' }}>
                          {resource.availabilityStart} - {resource.availabilityEnd}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '20px',
                            backgroundColor: getStatusMeta(resource.status).color === '#16a34a' ? '#dcfce7' : '#fee2e2',
                            fontSize: '0.7rem',
                            fontWeight: '500'
                          }}>
                            <span style={{
                              width: '0.5rem',
                              height: '0.5rem',
                              borderRadius: '50%',
                              backgroundColor: getStatusMeta(resource.status).color
                            }} />
                            {getStatusMeta(resource.status).label}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          <button
                            onClick={(event) => {
                              event.stopPropagation()
                              markRecentlyViewed(resource.id)
                              navigate(`/bookings?tab=new&resourceId=${encodeURIComponent(resource.id)}&location=${encodeURIComponent(resource.location || '')}&capacity=${encodeURIComponent(resource.capacity ?? '')}&returnTo=${encodeURIComponent('/resources')}`)
                            }}
                            disabled={resource.status !== 'ACTIVE'}
                            style={{
                              padding: '0.3rem 0.75rem',
                              borderRadius: '6px',
                              border: '1px solid #d1d5db',
                              backgroundColor: resource.status === 'ACTIVE' ? '#3b82f6' : '#e5e7eb',
                              color: resource.status === 'ACTIVE' ? '#fff' : '#9ca3af',
                              cursor: resource.status === 'ACTIVE' ? 'pointer' : 'not-allowed'
                            }}
                          >
                            Book ✏️
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}

            {!loading && filteredResources.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                No resources found in this category
              </div>
            )}

            {/* Pagination like eProduct */}
            <div style={{
              padding: '0.75rem',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end',
              fontSize: '0.75rem',
              color: '#6b7280'
            }}>
              Showing 1-{filteredResources.length} of {filteredResources.length}
            </div>
          </div>

          {/* Booking calendar */}
          <aside className="ticket-enter" style={{
            background: 'linear-gradient(135deg, #fff 0%, #f8fafc 100%)',
            border: '1px solid #e5e7eb',
            borderRadius: '14px',
            padding: '0.85rem',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
            position: 'sticky',
            top: '1rem',
            animationDelay: '600ms',
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              marginBottom: '0.8rem'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                  Booking calendar
                </h3>
                <p style={{ margin: '0.15rem 0 0', color: '#64748b', fontSize: '0.75rem' }}>
                  Click a date to see booked times and free slots.
                </p>
              </div>

              <select
                value={selectedCalendarResourceId}
                onChange={(e) => setSelectedCalendarResourceId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.4rem 0.55rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  background: '#fff',
                  fontSize: '0.8rem'
                }}
              >
                {filteredResources.map((resource) => (
                  <option key={resource.id} value={resource.id}>
                    {resource.name}
                  </option>
                ))}
              </select>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem' }}>
                <button
                  onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                  style={{
                    border: '1px solid #d1d5db',
                    background: '#fff',
                    borderRadius: '8px',
                    padding: '0.35rem 0.55rem',
                    cursor: 'pointer'
                  }}
                >
                  ◀
                </button>
                <strong style={{ textAlign: 'center', color: '#0f172a', fontSize: '0.82rem' }}>
                  {calendarMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                </strong>
                <button
                  onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                  style={{
                    border: '1px solid #d1d5db',
                    background: '#fff',
                    borderRadius: '8px',
                    padding: '0.35rem 0.55rem',
                    cursor: 'pointer'
                  }}
                >
                  ▶
                </button>
              </div>
            </div>

            {selectedCalendarResource ? (
              <p style={{ margin: '0 0 0.65rem', color: '#475569', fontSize: '0.74rem', lineHeight: 1.4 }}>
                <strong>{selectedCalendarResource.name}</strong>
                <br />
                {selectedCalendarResource.availabilityStartDate && selectedCalendarResource.availabilityEndDate
                  ? `${selectedCalendarResource.availabilityStartDate} to ${selectedCalendarResource.availabilityEndDate}`
                  : 'No date range set'}
                {(selectedCalendarResource.availabilityStart && selectedCalendarResource.availabilityEnd) ? (
                  <>
                    <br />
                    {selectedCalendarResource.availabilityStart} - {selectedCalendarResource.availabilityEnd}
                  </>
                ) : null}
              </p>
            ) : null}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.25rem' }}>
              {CALENDAR_WEEK_DAYS.map((day) => (
                <div key={day} style={{ textAlign: 'center', fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>
                  {day}
                </div>
              ))}

              {calendarCells.map((cellDate, index) => {
                if (!cellDate) {
                  return <div key={`empty-${index}`} style={{ minHeight: '24px' }} />
                }

                const dateKey = toDateKey(cellDate)
                const dayState = getDayAvailabilityState(selectedCalendarResource, cellDate, bookingDateMap)
                const isInRange = resourceRangeDateKeys.size === 0 || resourceRangeDateKeys.has(dateKey)
                const isToday = dateKey === toDateKey(new Date())
                const isSelected = dateKey === selectedCalendarDateKey

                let borderColor = '#e2e8f0'
                let backgroundColor = '#fff'
                let textColor = '#0f172a'
                let dayTitle = 'View availability for this date'

                if (dayState === 'fully-booked' || dayState === 'booked-only') {
                  borderColor = '#fda4af'
                  backgroundColor = '#ffe4e6'
                  textColor = '#be123c'
                  dayTitle = 'Fully booked'
                } else if (dayState === 'partially-booked') {
                  borderColor = '#fbbf24'
                  backgroundColor = '#fef3c7'
                  textColor = '#92400e'
                  dayTitle = 'Partially available'
                } else if (dayState === 'fully-available') {
                  borderColor = '#86efac'
                  backgroundColor = '#dcfce7'
                  textColor = '#166534'
                  dayTitle = 'Fully available'
                }

                if (isToday && dayState === 'unknown') {
                  borderColor = '#93c5fd'
                }

                if (isSelected) {
                  borderColor = '#2563eb'
                  backgroundColor = '#dbeafe'
                  textColor = '#1d4ed8'
                }

                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => setSelectedCalendarDateKey(dateKey)}
                    title={dayTitle}
                    style={{
                      minHeight: '24px',
                      borderRadius: '7px',
                      border: `1px solid ${borderColor}`,
                      background: backgroundColor,
                      color: !isInRange ? '#94a3b8' : textColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.72rem',
                      fontWeight: dayState !== 'unknown' || isSelected ? 700 : 500,
                      cursor: 'pointer',
                      opacity: isInRange ? 1 : 0.45,
                    }}
                  >
                    {cellDate.getDate()}
                  </button>
                )
              })}
            </div>

            <div style={{
              marginTop: '0.55rem',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              fontSize: '0.68rem',
              color: '#475569'
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ width: '0.55rem', height: '0.55rem', borderRadius: '50%', background: '#f87171' }} /> Fully booked
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ width: '0.55rem', height: '0.55rem', borderRadius: '50%', background: '#fbbf24' }} /> Partially available
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ width: '0.55rem', height: '0.55rem', borderRadius: '50%', background: '#4ade80' }} /> Fully available
              </span>
            </div>

            <div style={{
              marginTop: '0.85rem',
              borderTop: '1px solid #e2e8f0',
              paddingTop: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.55rem'
            }}>
              <div style={{
                borderRadius: '10px',
                background: '#f8fafc',
                border: '1px solid #dbe4f0',
                padding: '0.65rem',
              }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                  Recently viewed resources
                </div>
                {recentlyViewedResources.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.32rem' }}>
                    {recentlyViewedResources.slice(0, 5).map((resource) => {
                      const fav = favouriteResourceIdSet.has(String(resource.id))
                      return (
                        <button
                          key={resource.id}
                          type="button"
                          onClick={() => focusResource(resource)}
                          style={{
                            border: '1px solid #dbe4f0',
                            background: '#fff',
                            borderRadius: '8px',
                            padding: '0.45rem 0.5rem',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '0.73rem',
                            color: '#334155',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.4rem',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                          }}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {resource.name}
                          </span>
                          <Star
                            size={14}
                            strokeWidth={1.7}
                            style={{
                              stroke: '#111827',
                              fill: fav ? '#facc15' : 'transparent',
                              flexShrink: 0,
                            }}
                          />
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.73rem', color: '#64748b' }}>
                    No recently viewed resources yet.
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Selected date</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                  {selectedCalendarDate ? formatDisplayDate(selectedCalendarDate) : 'Choose a date'}
                </div>
              </div>

              <>
                {selectedCalendarDate && !isDateWithinResourceRange(selectedCalendarResource, selectedCalendarDate) ? (
                  <div style={{
                    borderRadius: '10px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    padding: '0.65rem',
                    fontSize: '0.75rem',
                    color: '#475569',
                    lineHeight: 1.45,
                  }}>
                    This date is outside the resource availability range. Existing bookings are shown below.
                  </div>
                ) : null}

                  <div style={{
                    borderRadius: '10px',
                    background: '#fff1f2',
                    border: '1px solid #fecdd3',
                    padding: '0.65rem',
                  }}>
                    <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#9f1239', marginBottom: '0.35rem' }}>
                      Booked time slots
                    </div>
                    {selectedDateBookedSlots.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        {selectedDateBookedSlots.map((slot) => (
                          <div
                            key={`${slot.id}-${slot.start.toISOString()}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.74rem',
                              color: '#881337',
                              background: '#fff',
                              border: '1px solid #fecdd3',
                              borderRadius: '8px',
                              padding: '0.4rem 0.5rem',
                            }}
                          >
                            <span>{formatTimeLabel(slot.start)} - {formatTimeLabel(slot.end)}</span>
                            <span>{slot.status}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.74rem', color: '#881337' }}>
                        No bookings on this date.
                      </div>
                    )}
                  </div>

                  <div style={{
                    borderRadius: '10px',
                    background: '#ecfdf5',
                    border: '1px solid #bbf7d0',
                    padding: '0.65rem',
                  }}>
                    <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#166534', marginBottom: '0.35rem' }}>
                      Available time slots
                    </div>
                    {selectedDateAvailabilityWindow ? (
                      selectedDateAvailableSlots.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          {selectedDateAvailableSlots.map((slot) => (
                            <div
                              key={`${slot.start.toISOString()}-${slot.end.toISOString()}`}
                              style={{
                                fontSize: '0.74rem',
                                color: '#166534',
                                background: '#fff',
                                border: '1px solid #bbf7d0',
                                borderRadius: '8px',
                                padding: '0.4rem 0.5rem',
                              }}
                            >
                              {formatTimeLabel(slot.start)} - {formatTimeLabel(slot.end)}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.74rem', color: '#166534' }}>
                          No free slot remains within {selectedCalendarResource?.availabilityStart} - {selectedCalendarResource?.availabilityEnd}.
                        </div>
                      )
                    ) : (
                      <div style={{ fontSize: '0.74rem', color: '#166534' }}>
                        {selectedCalendarDate && !isDateWithinResourceRange(selectedCalendarResource, selectedCalendarDate)
                          ? 'Selected date is outside configured availability, so no free slot can be computed.'
                          : 'Daily availability hours are not set for this resource.'}
                      </div>
                    )}
                  </div>

              </>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
