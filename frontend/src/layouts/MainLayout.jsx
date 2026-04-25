import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AdminNavbar from '../components/AdminNavbar'
import Navbar from '../components/Navbar'
import SystemAdminNavbar from '../components/SystemAdminNavbar'
import TechnicianNavbar from '../components/TechnicianNavbar'

export default function MainLayout() {
  const location = useLocation()
  const { roles } = useAuth()
  const hasRole = (role) => roles && roles.includes(role)
  const adminFullBleed = location.pathname.startsWith('/admin/')
  const ticketsWide =
    location.pathname.startsWith('/tickets') ||
    location.pathname.startsWith('/technician/tickets')
  const bookingsWide = location.pathname.startsWith('/bookings')
  const mainClass = adminFullBleed
    ? 'flex flex-1 min-h-0 flex-col overflow-hidden bg-[#11192b] p-0'
    : ticketsWide
      ? 'mx-0 w-full flex-1 min-h-0 px-4 py-4 sm:px-6 lg:px-8'
      : bookingsWide
        ? 'mx-0 w-full flex-1 min-h-0 px-[clamp(0.75rem,2.5vw,2rem)] py-6'
        : 'mx-auto w-full max-w-7xl flex-1 min-h-0 px-4 py-6 sm:px-6 lg:px-8'

  const navbar = hasRole('ROLE_SYSTEM_ADMIN') ? (
    <SystemAdminNavbar />
  ) : hasRole('ROLE_ADMIN') ? (
    <AdminNavbar />
  ) : hasRole('ROLE_TECHNICIAN') ? (
    <TechnicianNavbar />
  ) : (
    <Navbar />
  )

  return (
    <div className="flex min-h-screen w-full flex-col">
      {navbar}
      <main className={mainClass}>
        {adminFullBleed ? (
          <div className="flex min-h-[calc(100vh-4rem)] flex-1 flex-col overflow-hidden bg-[#11192b]">
            <Outlet />
          </div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  )
}
