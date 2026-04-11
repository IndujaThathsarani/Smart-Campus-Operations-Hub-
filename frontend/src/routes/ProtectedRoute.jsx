import { Outlet } from 'react-router-dom'

/**
 * Wrap routes that require authentication. Replace with real auth (e.g. OAuth) checks later.
 */
export default function ProtectedRoute() {
  return <Outlet />
}
