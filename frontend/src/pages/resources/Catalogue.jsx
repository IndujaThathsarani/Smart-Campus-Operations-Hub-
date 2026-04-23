import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiSend } from '../../services/apiClient'

const CALENDAR_WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getStatusMeta(status) {
  if (status === 'ACTIVE') {
    return { label: 'Active', color: '#16a34a' }
  }
  if (status === 'OUT_OF_SERVICE') {
    return { label: 'Out of service', color: '#dc2626' }
  }
  return { label: status || 'Unknown', color: '#6b7280' }
}

// Resource categories for sidebar
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

function toDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getBookedDateKeys(bookings, resourceId) {
  if (!resourceId) return new Set()

  const bookedDateKeys = new Set()

  bookings.forEach((booking) => {
    if (booking.resourceId !== resourceId) return
    if (booking.status === 'REJECTED' || booking.status === 'CANCELLED') return

    const start = new Date(booking.startTime)
    const end = new Date(booking.endTime)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return

    const current = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    const last = new Date(end.getFullYear(), end.getMonth(), end.getDate())

    while (current <= last) {
      bookedDateKeys.add(toDateKey(current))
      current.setDate(current.getDate() + 1)
    }
  })

  return bookedDateKeys
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

export default function Catalogue() {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('LECTURE_HALL')
  const [resources, setResources] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCalendarResourceId, setSelectedCalendarResourceId] = useState('')
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [filters, setFilters] = useState({
    location: '',
    minCapacity: '',
    status: 'ACTIVE',
  })

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
    return resources.filter((resource) => {
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
  }, [resources, activeCategory, filters])

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

  const selectedCalendarResource = useMemo(() => {
    return filteredResources.find((resource) => resource.id === selectedCalendarResourceId) || null
  }, [filteredResources, selectedCalendarResourceId])

  const bookedDateKeys = useMemo(() => {
    const bookingKeys = getBookedDateKeys(bookings, selectedCalendarResourceId)
    const rangeKeys = getResourceRangeDateKeys(selectedCalendarResource)

    return new Set([...bookingKeys, ...rangeKeys])
  }, [bookings, selectedCalendarResourceId, selectedCalendarResource])

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

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#f3f4f6',
        width: '100vw',
        marginLeft: 'calc(50% - 50vw)',
        marginRight: 'calc(50% - 50vw)',
        marginTop: '-1.5rem',
        overflowX: 'hidden',
      }}
    >
      {/* SIDEBAR - Like eProduct Dashboard */}
      <aside style={{
        width: '280px',
        backgroundColor: '#1e293b',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        height: '100vh',
        overflowY: 'auto'
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
      <main style={{ flex: 1, marginLeft: '280px', padding: '1.5rem' }}>
        {/* Header with active category */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
            {resourceCategories.find((category) => category.id === activeCategory)?.label || 'Resources'}
          </h1>
          <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>
            {categoryCounts[activeCategory] || 0} resources available
          </p>
        </div>

        {/* Stats Cards - Like eProduct order summary */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ background: '#fff', padding: '1rem', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total Resources</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{resources.length}</div>
          </div>
          <div style={{ background: '#fff', padding: '1rem', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Active</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#16a34a' }}>{resources.filter(r => r.status === 'ACTIVE').length}</div>
          </div>
          <div style={{ background: '#fff', padding: '1rem', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Out of Service</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc2626' }}>{resources.filter(r => r.status === 'OUT_OF_SERVICE').length}</div>
          </div>
          <div style={{ background: '#fff', padding: '1rem', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Categories</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{resourceCategories.length}</div>
          </div>
        </div>

        {/* Filters Bar */}
        <div style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '10px',
          padding: '1rem',
          marginBottom: '1rem',
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
          alignItems: 'center'
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
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 300px',
          gap: '1rem',
          alignItems: 'start'
        }}>
          {/* Resources Table - Like eProduct orders table */}
          <div style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            overflowX: 'auto'
          }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>Loading resources...</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>ID</th>
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
                  {filteredResources.map((resource, idx) => (
                    <tr key={resource.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.75rem', color: '#6b7280' }}>#{idx + 1}</td>
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
                          onClick={() => navigate(`/bookings?tab=new&resourceId=${encodeURIComponent(resource.name || resource.id)}&location=${encodeURIComponent(resource.location || '')}`)}
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
                  ))}
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
          <aside style={{
            background: 'linear-gradient(135deg, #fff 0%, #f8fafc 100%)',
            border: '1px solid #e5e7eb',
            borderRadius: '14px',
            padding: '0.85rem',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
            position: 'sticky',
            top: '1rem'
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
                  Red dates are already booked.
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
                const isBooked = bookedDateKeys.has(dateKey)
                const isToday = dateKey === toDateKey(new Date())

                return (
                  <div
                    key={dateKey}
                    title={isBooked ? 'Booked date' : 'Available date'}
                    style={{
                      minHeight: '24px',
                      borderRadius: '7px',
                      border: `1px solid ${isBooked ? '#fda4af' : isToday ? '#93c5fd' : '#e2e8f0'}`,
                      background: isBooked ? '#ffe4e6' : '#fff',
                      color: isBooked ? '#be123c' : '#0f172a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.72rem',
                      fontWeight: isBooked ? 700 : 500,
                    }}
                  >
                    {cellDate.getDate()}
                  </div>
                )
              })}
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}