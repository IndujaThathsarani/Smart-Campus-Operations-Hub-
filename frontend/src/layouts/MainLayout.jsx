import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AdminNavbar from '../components/AdminNavbar'
import Navbar from '../components/Navbar'
import SystemAdminNavbar from '../components/SystemAdminNavbar'
import TechnicianNavbar from '../components/TechnicianNavbar'

export default function MainLayout() {
  const location = useLocation()
  const adminFullBleed = location.pathname.startsWith('/admin/') && !location.pathname.startsWith('/admin/bookings')
  const bookingsWide = location.pathname.startsWith('/bookings')
  const adminBookings = location.pathname.startsWith('/admin/bookings')

  return (
    <div className="app-shell">
      {adminFullBleed || adminBookings ? <AdminNavbar /> : <Navbar />}
      <main className={adminBookings ? 'app-main app-main--wide' : adminFullBleed ? 'app-main app-main--full' : bookingsWide ? 'app-main app-main--wide' : 'app-main'}>
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
