import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getCatalogueResources,
  RESOURCE_TYPES,
} from '../../utils/resourceCatalogueStorage'

export default function Catalogue() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState({
    type: '',
    location: '',
    minCapacity: '',
    status: 'ACTIVE',
  })

  const resources = useMemo(() => getCatalogueResources(), [])

  const filteredResources = useMemo(() => {
    return resources.filter((resource) => {
      const typeMatch = !filters.type || resource.type === filters.type
      const locationMatch =
        !filters.location ||
        resource.location.toLowerCase().includes(filters.location.toLowerCase())
      const capacityFilter = Number(filters.minCapacity)
      const capacityMatch =
        !filters.minCapacity ||
        (!Number.isNaN(capacityFilter) && resource.capacity >= capacityFilter)
      const statusMatch = !filters.status || resource.status === filters.status

      return typeMatch && locationMatch && capacityMatch && statusMatch
    })
  }, [resources, filters])

  return (
    <section>
      <h1 className="page-title">Facilities &amp; assets catalogue</h1>
      <p className="page-lead">
        Browse available resources and continue to bookings.
      </p>

      <div
        style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '10px',
          padding: '1rem',
          marginBottom: '1rem',
          display: 'grid',
          gap: '0.75rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        }}
      >
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
          placeholder="Location contains..."
          value={filters.location}
          onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
        />

        <input
          type="number"
          placeholder="Min capacity"
          value={filters.minCapacity}
          onChange={(e) =>
            setFilters((f) => ({ ...f, minCapacity: e.target.value }))
          }
        />

        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="OUT_OF_SERVICE">Out of service</option>
        </select>
      </div>

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
              <th style={{ textAlign: 'left', padding: '0.75rem' }}>Time</th>
              <th style={{ textAlign: 'left', padding: '0.75rem' }}>Status</th>
              <th style={{ textAlign: 'right', padding: '0.75rem' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredResources.map((resource) => (
              <tr key={resource.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.75rem' }}>{resource.name}</td>
                <td style={{ padding: '0.75rem' }}>
                  {resource.type.replace('_', ' ')}
                </td>
                <td style={{ padding: '0.75rem' }}>{resource.location}</td>
                <td style={{ padding: '0.75rem' }}>{resource.capacity}</td>
                <td style={{ padding: '0.75rem' }}>
                  {resource.availabilityStart} - {resource.availabilityEnd}
                </td>
                <td style={{ padding: '0.75rem' }}>{resource.status}</td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                  <button
                    onClick={() => navigate('/bookings')}
                    disabled={resource.status !== 'ACTIVE'}
                    style={{
                      padding: '0.4rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      cursor:
                        resource.status === 'ACTIVE' ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Book
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredResources.length === 0 ? (
        <p className="page-lead" style={{ marginTop: '0.75rem' }}>
          No resources found.
        </p>
      ) : null}
    </section>
  )
}
