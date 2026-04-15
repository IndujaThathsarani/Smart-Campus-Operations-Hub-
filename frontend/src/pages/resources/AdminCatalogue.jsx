import { useMemo, useState } from 'react'
import {
  createResourceId,
  getCatalogueResources,
  RESOURCE_TYPES,
  saveCatalogueResources,
} from '../../utils/resourceCatalogueStorage'

const EMPTY_FORM = {
  name: '',
  type: 'CLASSROOM',
  capacity: '',
  location: '',
  availabilityStart: '08:00',
  availabilityEnd: '17:00',
  status: 'ACTIVE',
  description: '',
}

export default function AdminCatalogue() {
  const [resources, setResources] = useState(() => getCatalogueResources())
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [filters, setFilters] = useState({ type: '', location: '', status: '' })
  const [formData, setFormData] = useState(EMPTY_FORM)

  const filtered = useMemo(() => {
    return resources.filter((resource) => {
      const typeMatch = !filters.type || resource.type === filters.type
      const locationMatch =
        !filters.location ||
        resource.location.toLowerCase().includes(filters.location.toLowerCase())
      const statusMatch = !filters.status || resource.status === filters.status
      return typeMatch && locationMatch && statusMatch
    })
  }, [resources, filters])

  function persist(next) {
    setResources(next)
    saveCatalogueResources(next)
  }

  function handleSubmit(e) {
    e.preventDefault()

    const payload = {
      ...formData,
      capacity: Number(formData.capacity),
      id: editingId || createResourceId(),
    }

    const next = editingId
      ? resources.map((resource) =>
          resource.id === editingId ? payload : resource,
        )
      : [...resources, payload]

    persist(next)
    setFormData(EMPTY_FORM)
    setEditingId(null)
    setShowForm(false)
  }

  function startEdit(resource) {
    setEditingId(resource.id)
    setFormData({
      ...resource,
      capacity: String(resource.capacity ?? ''),
    })
    setShowForm(true)
  }

  function handleDelete(id) {
    const next = resources.filter((resource) => resource.id !== id)
    persist(next)
  }

  return (
    <section>
      <h1 className="page-title">Admin catalogue</h1>
      <p className="page-lead">
        Add, edit and remove resources shown to users in the Resources section.
      </p>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <select
            value={filters.type}
            onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
          >
            <option value="">All Types</option>
            {RESOURCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replace('_', ' ')}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Filter location"
            value={filters.location}
            onChange={(e) =>
              setFilters((f) => ({ ...f, location: e.target.value }))
            }
          />
          <select
            value={filters.status}
            onChange={(e) =>
              setFilters((f) => ({ ...f, status: e.target.value }))
            }
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="OUT_OF_SERVICE">Out of service</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingId(null)
            setFormData(EMPTY_FORM)
            setShowForm((s) => !s)
          }}
          style={{
            padding: '0.45rem 0.85rem',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            background: '#111827',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          {showForm ? 'Close Form' : 'Add New'}
        </button>
      </div>

      {showForm ? (
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'grid',
            gap: '0.75rem',
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            padding: '1rem',
            marginBottom: '1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          }}
        >
          <input
            required
            placeholder="Name"
            value={formData.name}
            onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
          />

          <select
            value={formData.type}
            onChange={(e) => setFormData((f) => ({ ...f, type: e.target.value }))}
          >
            {RESOURCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replace('_', ' ')}
              </option>
            ))}
          </select>

          <input
            type="number"
            required
            min="1"
            placeholder="Capacity"
            value={formData.capacity}
            onChange={(e) =>
              setFormData((f) => ({ ...f, capacity: e.target.value }))
            }
          />

          <input
            required
            placeholder="Location"
            value={formData.location}
            onChange={(e) =>
              setFormData((f) => ({ ...f, location: e.target.value }))
            }
          />

          <input
            type="time"
            value={formData.availabilityStart}
            onChange={(e) =>
              setFormData((f) => ({ ...f, availabilityStart: e.target.value }))
            }
          />

          <input
            type="time"
            value={formData.availabilityEnd}
            onChange={(e) =>
              setFormData((f) => ({ ...f, availabilityEnd: e.target.value }))
            }
          />

          <select
            value={formData.status}
            onChange={(e) =>
              setFormData((f) => ({ ...f, status: e.target.value }))
            }
          >
            <option value="ACTIVE">Active</option>
            <option value="OUT_OF_SERVICE">Out of service</option>
          </select>

          <input
            placeholder="Description"
            value={formData.description}
            onChange={(e) =>
              setFormData((f) => ({ ...f, description: e.target.value }))
            }
          />

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit">
              {editingId ? 'Update Resource' : 'Create Resource'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setEditingId(null)
                setFormData(EMPTY_FORM)
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div
        style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '10px',
          overflowX: 'auto',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ textAlign: 'left', padding: '0.75rem' }}>Name</th>
              <th style={{ textAlign: 'left', padding: '0.75rem' }}>Type</th>
              <th style={{ textAlign: 'left', padding: '0.75rem' }}>Location</th>
              <th style={{ textAlign: 'left', padding: '0.75rem' }}>Capacity</th>
              <th style={{ textAlign: 'left', padding: '0.75rem' }}>Status</th>
              <th style={{ textAlign: 'right', padding: '0.75rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((resource) => (
              <tr key={resource.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.75rem' }}>{resource.name}</td>
                <td style={{ padding: '0.75rem' }}>
                  {resource.type.replace('_', ' ')}
                </td>
                <td style={{ padding: '0.75rem' }}>{resource.location}</td>
                <td style={{ padding: '0.75rem' }}>{resource.capacity}</td>
                <td style={{ padding: '0.75rem' }}>{resource.status}</td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                  <button
                    onClick={() => startEdit(resource)}
                    style={{ marginRight: '0.5rem' }}
                  >
                    Edit
                  </button>
                  <button onClick={() => handleDelete(resource.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 ? (
        <p className="page-lead" style={{ marginTop: '0.75rem' }}>
          No resources found for the selected filters.
        </p>
      ) : null}
    </section>
  )
}
