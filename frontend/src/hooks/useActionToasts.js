import { useCallback, useEffect, useRef, useState } from 'react'

let toastIdSeed = 0

export function useActionToasts(defaultDuration = 0) {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef(new Map())

  const dismissToast = useCallback((id) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      window.clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const pushToast = useCallback(
    ({ title, message, variant = 'success', duration = defaultDuration }) => {
      const id = ++toastIdSeed
      setToasts((prev) => [...prev, { id, title, message, variant }])
      if (duration > 0) {
        const timer = window.setTimeout(() => {
          dismissToast(id)
        }, duration)
        timersRef.current.set(id, timer)
      }
      return id
    },
    [defaultDuration, dismissToast],
  )

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer))
      timersRef.current.clear()
    }
  }, [])

  return { toasts, pushToast, dismissToast }
}
