import { Outlet, useLocation } from 'react-router-dom'
import AdminNavbar from '../components/AdminNavbar'
import Navbar from '../components/Navbar'

export default function MainLayout() {
  const location = useLocation()
  const adminFullBleed = location.pathname.startsWith('/admin/')
  const ticketsWide =
    location.pathname.startsWith('/tickets') ||
    location.pathname.startsWith('/technician/tickets')
  const bookingsWide = location.pathname.startsWith('/bookings')
  const mainClass = adminFullBleed
    ? 'flex flex-1 min-h-0 flex-col overflow-hidden p-0'
    : ticketsWide
      ? 'mx-0 w-full flex-1 min-h-0 px-4 py-4 sm:px-6 lg:px-8'
      : bookingsWide
        ? 'mx-0 w-full flex-1 min-h-0 px-[clamp(0.75rem,2.5vw,2rem)] py-6'
        : 'mx-auto w-full max-w-7xl flex-1 min-h-0 px-4 py-6 sm:px-6 lg:px-8'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {adminFullBleed ? <AdminNavbar /> : <Navbar />}
      <main className={mainClass}>
        {adminFullBleed ? (
          <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            <Outlet />
          </div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  )
}
