import { useEffect, useMemo, useState } from 'react'
import { apiGet, apiSend } from '../../services/apiClient'
import { RESOURCE_TYPES } from '../../utils/resourceCatalogueStorage'

function getTodayIsoDate() {
  return new Date().toISOString().split('T')[0]
}

function addDaysIsoDate(isoDate, days) {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return isoDate
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

function getTypeLabel(type) {
  if (type === 'LECTURE_HALL' || type === 'CLASSROOM') return 'Lecture Hall'
  if (type === 'LABORATORY' || type === 'LAB') return 'Laboratory'
  if (type === 'SEMINAR_ROOM') return 'Seminar Room'
  if (type === 'TRAINING_ROOM') return 'Training Room'
  if (type === 'WORKSHOP_AREA') return 'Workshop Area'
  if (type === 'LIBRARY_SPACE') return 'Library Space'
  if (type === 'AUDITORIUM') return 'Auditorium'
  if (type === 'MEETING_ROOM') return 'Meeting Room'
  if (type === 'EQUIPMENT') return 'Equipment'
  if (type === 'STUDIO') return 'Studio'
  if (type === 'OTHER') return 'Other'
  return String(type || 'Unknown').replace(/_/g, ' ')
}

function normalizeTypeForForm(type) {
  if (type === 'CLASSROOM') return 'LECTURE_HALL'
  if (type === 'LAB') return 'LABORATORY'
  return type || 'LECTURE_HALL'
}

function matchesTypeFilter(resourceType, selectedType) {
  if (!selectedType) return true
  if (selectedType === 'LECTURE_HALL') {
    return resourceType === 'LECTURE_HALL' || resourceType === 'CLASSROOM'
  }
  if (selectedType === 'LABORATORY') {
    return resourceType === 'LABORATORY' || resourceType === 'LAB'
  }
  return resourceType === selectedType
}

function normalizeTypeForApi(type) {
  if (type === 'LECTURE_HALL') return 'CLASSROOM'
  if (type === 'LABORATORY') return 'LAB'
  return type
}

function getStatusMeta(status) {
  if (status === 'ACTIVE') {
    return {
      label: 'Active',
      dotClass: 'bg-emerald-500',
      cardClass: 'border-emerald-200 bg-emerald-50/80 text-emerald-700',
    }
  }

  if (status === 'OUT_OF_SERVICE') {
    return {
      label: 'Out of service',
      dotClass: 'bg-rose-500',
      cardClass: 'border-rose-200 bg-rose-50/80 text-rose-700',
    }
  }

  return {
    label: status || 'Unknown',
    dotClass: 'bg-slate-400',
    cardClass: 'border-slate-200 bg-slate-50 text-slate-600',
  }
}

function toMinutes(value) {
  if (!value || !value.includes(':')) return NaN
  const [hour, minute] = value.split(':').map(Number)
  if (Number.isNaN(hour) || Number.isNaN(minute)) return NaN
  return hour * 60 + minute
}

function validateForm(data) {
  const errors = {}
  const name = (data.name || '').trim()
  const location = (data.location || '').trim()
  const description = (data.description || '').trim()
  const capacity = Number(data.capacity)
  const startDate = data.availabilityStartDate
  const endDate = data.availabilityEndDate
  const startMinutes = toMinutes(data.availabilityStart)
  const endMinutes = toMinutes(data.availabilityEnd)

  if (!name) {
    errors.name = 'Resource name is required.'
  } else if (name.length < 3) {
    errors.name = 'Name must be at least 3 characters.'
  } else if (name.length > 70) {
    errors.name = 'Name must be 70 characters or fewer.'
  }

  if (!location) {
    errors.location = 'Location is required.'
  } else if (location.length < 2) {
    errors.location = 'Location must be at least 2 characters.'
  } else if (location.length > 80) {
    errors.location = 'Location must be 80 characters or fewer.'
  }

  if (!Number.isInteger(capacity) || capacity <= 0) {
    errors.capacity = 'Capacity must be a positive whole number.'
  } else if (capacity > 10000) {
    errors.capacity = 'Capacity cannot exceed 10000.'
  }

  if (!data.type || !RESOURCE_TYPES.includes(data.type)) {
    errors.type = 'Select a valid resource type.'
  }

  if (!data.status || !['ACTIVE', 'OUT_OF_SERVICE'].includes(data.status)) {
    errors.status = 'Select a valid status.'
  }

  if (!startDate) {
    errors.availabilityStartDate = 'Choose a start date.'
  }

  if (!endDate) {
    errors.availabilityEndDate = 'Choose an end date.'
  }

  if (startDate && endDate && startDate > endDate) {
    errors.availabilityEndDate = 'End date must be on or after start date.'
  }

  if (Number.isNaN(startMinutes)) {
    errors.availabilityStart = 'Choose a valid start time.'
  }

  if (Number.isNaN(endMinutes)) {
    errors.availabilityEnd = 'Choose a valid end time.'
  }

  if (!Number.isNaN(startMinutes) && !Number.isNaN(endMinutes) && startMinutes >= endMinutes) {
    errors.availabilityEnd = 'End time must be later than start time.'
  }

  if (description.length > 250) {
    errors.description = 'Description must be 250 characters or fewer.'
  }

  return errors
}

const EMPTY_FORM = {
  name: '',
  type: 'LECTURE_HALL',
  capacity: '',
  location: '',
  availabilityStartDate: getTodayIsoDate(),
  availabilityEndDate: addDaysIsoDate(getTodayIsoDate(), 30),
  availabilityStart: '08:00',
  availabilityEnd: '17:00',
  status: 'ACTIVE',
  description: '',
}

export default function AdminCatalogue() {
  const [resources, setResources] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [filters, setFilters] = useState({ type: '', location: '', status: '' })
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchResources()
  }, [])

  async function fetchResources() {
    setLoading(true)
    setError(null)
    try {
      const data = await apiGet('/api/resources')
      setResources(Array.isArray(data) ? data : [])
    } catch (err) {
      setResources([])
      setError(err.body?.message || 'Failed to load resources')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    return resources.filter((resource) => {
      const typeMatch = matchesTypeFilter(resource.type, filters.type)
      const locationMatch =
        !filters.location ||
        (resource.location || '').toLowerCase().includes(filters.location.toLowerCase())
      const statusMatch = !filters.status || resource.status === filters.status
      return typeMatch && locationMatch && statusMatch
    })
  }, [resources, filters])

  const stats = useMemo(() => {
    const active = resources.filter((resource) => resource.status === 'ACTIVE').length
    const outOfService = resources.filter((resource) => resource.status === 'OUT_OF_SERVICE').length

    return {
      total: resources.length,
      active,
      outOfService,
    }
  }, [resources])

  function updateFormField(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setFormErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()

    const validationErrors = validateForm(formData)
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors)
      return
    }

    setLoading(true)
    setError(null)

    const payload = {
      name: formData.name.trim(),
      type: normalizeTypeForApi(formData.type),
      capacity: Number(formData.capacity),
      location: formData.location.trim(),
      availabilityStartDate: formData.availabilityStartDate,
      availabilityEndDate: formData.availabilityEndDate,
      availabilityStart: formData.availabilityStart,
      availabilityEnd: formData.availabilityEnd,
      status: formData.status,
      description: formData.description.trim(),
    }

    try {
      if (editingId) {
        await apiSend(`/api/resources/${editingId}`, {
          method: 'PUT',
          body: payload,
        })
      } else {
        await apiSend('/api/resources', {
          method: 'POST',
          body: payload,
        })
      }

      setFormData(EMPTY_FORM)
      setEditingId(null)
      setFormErrors({})
      setShowForm(false)
      await fetchResources()
    } catch (err) {
      setError(err.body?.message || 'Failed to save resource')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function openCreateForm() {
    setEditingId(null)
    setFormData(EMPTY_FORM)
    setFormErrors({})
    setShowForm(true)
  }

  function startEdit(resource) {
    setEditingId(resource.id)
    setFormData({
      name: resource.name || '',
      type: normalizeTypeForForm(resource.type),
      capacity: String(resource.capacity ?? ''),
      location: resource.location || '',
      availabilityStartDate: resource.availabilityStartDate || getTodayIsoDate(),
      availabilityEndDate: resource.availabilityEndDate || addDaysIsoDate(getTodayIsoDate(), 30),
      availabilityStart: resource.availabilityStart || '08:00',
      availabilityEnd: resource.availabilityEnd || '17:00',
      status: resource.status || 'ACTIVE',
      description: resource.description || '',
    })
    setFormErrors({})
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setFormErrors({})
    setFormData(EMPTY_FORM)
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this resource?')) return
    setLoading(true)
    setError(null)
    try {
      await apiSend(`/api/resources/${id}`, { method: 'DELETE' })
      await fetchResources()
    } catch (err) {
      setError(err.body?.message || 'Failed to delete resource')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="relative overflow-hidden rounded-[28px] bg-slate-950 px-4 py-5 text-slate-100 shadow-2xl shadow-slate-950/20 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 opacity-100">
        <div className="absolute -right-16 top-0 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute -left-12 bottom-0 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-5">
        <header className="rounded-[24px] border border-white/10 bg-white/8 p-5 shadow-lg shadow-black/10 backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200/85">
                Operations Console
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Resource Admin Dashboard
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Manage smart campus facilities, statuses, and availability from one polished control panel.
              </p>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={openCreateForm}
              className="inline-flex items-center justify-center rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              + Add Resource
            </button>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-[22px] border border-white/10 bg-white/8 p-5 shadow-lg shadow-black/10 backdrop-blur-xl">
            <p className="text-sm text-slate-300">Total Resources</p>
            <strong className="mt-2 block text-3xl font-semibold text-white">{stats.total}</strong>
          </article>
          <article className="rounded-[22px] border border-emerald-400/20 bg-emerald-500/10 p-5 shadow-lg shadow-black/10 backdrop-blur-xl">
            <p className="text-sm text-emerald-100">Active</p>
            <strong className="mt-2 block text-3xl font-semibold text-emerald-50">{stats.active}</strong>
          </article>
          <article className="rounded-[22px] border border-rose-400/20 bg-rose-500/10 p-5 shadow-lg shadow-black/10 backdrop-blur-xl">
            <p className="text-sm text-rose-100">Out of Service</p>
            <strong className="mt-2 block text-3xl font-semibold text-rose-50">{stats.outOfService}</strong>
          </article>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/8 p-4 shadow-lg shadow-black/10 backdrop-blur-xl sm:p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <label htmlFor="filter-type" className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                Type
              </label>
              <select
                id="filter-type"
                value={filters.type}
                onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
                disabled={loading}
                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">All Types</option>
                {RESOURCE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {getTypeLabel(type)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <label htmlFor="filter-location" className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                Location
              </label>
              <input
                id="filter-location"
                type="text"
                placeholder="Search location"
                value={filters.location}
                onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
                disabled={loading}
                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="filter-status" className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                Status
              </label>
              <select
                id="filter-status"
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                disabled={loading}
                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="OUT_OF_SERVICE">Out of service</option>
              </select>
            </div>
          </div>
        </div>

        {showForm ? (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="rounded-[28px] border border-white/10 bg-white p-5 text-slate-900 shadow-2xl shadow-slate-950/15 sm:p-6"
          >
            <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  {editingId ? 'Edit Resource' : 'Create Resource'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Fill all required details before saving.
                </p>
              </div>
              <span className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Admin form
              </span>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="resource-name" className="text-sm font-semibold text-slate-700">
                  Name
                </label>
                <input
                  id="resource-name"
                  type="text"
                  placeholder="Main Auditorium"
                  value={formData.name}
                  onChange={(e) => updateFormField('name', e.target.value)}
                  disabled={loading}
                  aria-invalid={Boolean(formErrors.name)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
                {formErrors.name ? <p className="text-sm text-rose-600">{formErrors.name}</p> : null}
              </div>

              <div className="grid gap-2">
                <label htmlFor="resource-type" className="text-sm font-semibold text-slate-700">
                  Type
                </label>
                <select
                  id="resource-type"
                  value={formData.type}
                  onChange={(e) => updateFormField('type', e.target.value)}
                  disabled={loading}
                  aria-invalid={Boolean(formErrors.type)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 disabled:cursor-not-allowed disabled:bg-slate-50"
                >
                  {RESOURCE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {getTypeLabel(type)}
                    </option>
                  ))}
                </select>
                {formErrors.type ? <p className="text-sm text-rose-600">{formErrors.type}</p> : null}
              </div>

              <div className="grid gap-2">
                <label htmlFor="resource-capacity" className="text-sm font-semibold text-slate-700">
                  Capacity
                </label>
                <input
                  id="resource-capacity"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="120"
                  value={formData.capacity}
                  onChange={(e) => updateFormField('capacity', e.target.value)}
                  disabled={loading}
                  aria-invalid={Boolean(formErrors.capacity)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
                {formErrors.capacity ? <p className="text-sm text-rose-600">{formErrors.capacity}</p> : null}
              </div>

              <div className="grid gap-2">
                <label htmlFor="resource-location" className="text-sm font-semibold text-slate-700">
                  Location
                </label>
                <input
                  id="resource-location"
                  type="text"
                  placeholder="Block B, Level 3"
                  value={formData.location}
                  onChange={(e) => updateFormField('location', e.target.value)}
                  disabled={loading}
                  aria-invalid={Boolean(formErrors.location)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
                {formErrors.location ? <p className="text-sm text-rose-600">{formErrors.location}</p> : null}
              </div>

              <div className="grid gap-2">
                <label htmlFor="resource-start-date" className="text-sm font-semibold text-slate-700">
                  Availability Start Date
                </label>
                <input
                  id="resource-start-date"
                  type="date"
                  value={formData.availabilityStartDate}
                  onChange={(e) => updateFormField('availabilityStartDate', e.target.value)}
                  disabled={loading}
                  aria-invalid={Boolean(formErrors.availabilityStartDate)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
                {formErrors.availabilityStartDate ? (
                  <p className="text-sm text-rose-600">{formErrors.availabilityStartDate}</p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <label htmlFor="resource-end-date" className="text-sm font-semibold text-slate-700">
                  Availability End Date
                </label>
                <input
                  id="resource-end-date"
                  type="date"
                  value={formData.availabilityEndDate}
                  onChange={(e) => updateFormField('availabilityEndDate', e.target.value)}
                  disabled={loading}
                  aria-invalid={Boolean(formErrors.availabilityEndDate)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
                {formErrors.availabilityEndDate ? (
                  <p className="text-sm text-rose-600">{formErrors.availabilityEndDate}</p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <label htmlFor="resource-start" className="text-sm font-semibold text-slate-700">
                  Availability Start
                </label>
                <input
                  id="resource-start"
                  type="time"
                  value={formData.availabilityStart}
                  onChange={(e) => updateFormField('availabilityStart', e.target.value)}
                  disabled={loading}
                  aria-invalid={Boolean(formErrors.availabilityStart)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
                {formErrors.availabilityStart ? (
                  <p className="text-sm text-rose-600">{formErrors.availabilityStart}</p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <label htmlFor="resource-end" className="text-sm font-semibold text-slate-700">
                  Availability End
                </label>
                <input
                  id="resource-end"
                  type="time"
                  value={formData.availabilityEnd}
                  onChange={(e) => updateFormField('availabilityEnd', e.target.value)}
                  disabled={loading}
                  aria-invalid={Boolean(formErrors.availabilityEnd)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
                {formErrors.availabilityEnd ? (
                  <p className="text-sm text-rose-600">{formErrors.availabilityEnd}</p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <label htmlFor="resource-status" className="text-sm font-semibold text-slate-700">
                  Status
                </label>
                <select
                  id="resource-status"
                  value={formData.status}
                  onChange={(e) => updateFormField('status', e.target.value)}
                  disabled={loading}
                  aria-invalid={Boolean(formErrors.status)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 disabled:cursor-not-allowed disabled:bg-slate-50"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="OUT_OF_SERVICE">Out of service</option>
                </select>
                {formErrors.status ? <p className="text-sm text-rose-600">{formErrors.status}</p> : null}
              </div>

              <div className="grid gap-2 md:col-span-2">
                <label htmlFor="resource-description" className="text-sm font-semibold text-slate-700">
                  Description
                </label>
                <textarea
                  id="resource-description"
                  rows="4"
                  placeholder="Add optional details about this facility."
                  value={formData.description}
                  onChange={(e) => updateFormField('description', e.target.value)}
                  disabled={loading}
                  aria-invalid={Boolean(formErrors.description)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
                <div className="flex items-center justify-between gap-4">
                  {formErrors.description ? (
                    <p className="text-sm text-rose-600">{formErrors.description}</p>
                  ) : (
                    <span />
                  )}
                  <small className="text-xs font-medium text-slate-500">
                    {formData.description.trim().length}/250
                  </small>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-200 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Saving...' : editingId ? 'Update Resource' : 'Create Resource'}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={closeForm}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-2xl shadow-slate-950/10">
          <div className="overflow-x-auto">
            <table className="min-w-[56rem] w-full border-collapse text-left">
              <thead className="bg-slate-950 text-xs uppercase tracking-[0.18em] text-slate-300">
                <tr>
                  <th className="px-5 py-4 font-semibold">Name</th>
                  <th className="px-5 py-4 font-semibold">Type</th>
                  <th className="px-5 py-4 font-semibold">Location</th>
                  <th className="px-5 py-4 font-semibold">Date Range</th>
                  <th className="px-5 py-4 font-semibold">Capacity</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-8 text-center text-sm text-slate-500">
                      Loading resources...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-8 text-center text-sm text-slate-500">
                      No resources found for selected filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((resource) => {
                    const statusMeta = getStatusMeta(resource.status)

                    return (
                      <tr key={resource.id} className="transition hover:bg-slate-50">
                        <td className="px-5 py-4 font-medium text-slate-950">{resource.name}</td>
                        <td className="px-5 py-4">{getTypeLabel(resource.type)}</td>
                        <td className="px-5 py-4">{resource.location}</td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {resource.availabilityStartDate && resource.availabilityEndDate
                            ? `${resource.availabilityStartDate} to ${resource.availabilityEndDate}`
                            : 'Not set'}
                        </td>
                        <td className="px-5 py-4">{resource.capacity}</td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.cardClass}`}
                          >
                            <span>{statusMeta.label}</span>
                            <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${statusMeta.dotClass}`} />
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex flex-wrap items-center justify-end gap-2">
                            <button
                              disabled={loading}
                              onClick={() => startEdit(resource)}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-900 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Edit
                            </button>
                            <button
                              disabled={loading}
                              onClick={() => handleDelete(resource.id)}
                              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}