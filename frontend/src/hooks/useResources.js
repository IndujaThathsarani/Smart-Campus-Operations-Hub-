import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '../services/apiClient'

const LOAD_ERROR =
  'Could not load the resource catalogue. You can still submit using a location only.'

// Hook to fetch and manage the list of resources for incident ticket forms (connects frontend to /api/resources)
export function useResources() {
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const list = await apiGet('/api/resources')
      setResources(Array.isArray(list) ? list : [])
    } catch {
      setResources([])
      setLoadError(LOAD_ERROR)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { resources, loading, loadError, reload }
}
