import { Outlet, useLocation } from 'react-router-dom'
import AdminNavbar from '../components/AdminNavbar'
import Navbar from '../components/Navbar'

export default function MainLayout() {
  const location = useLocation()
  const adminFullBleed = location.pathname.startsWith('/admin/')

  return (
    <div className="app-shell">
      {adminFullBleed ? <AdminNavbar /> : <Navbar />}
      <main className={adminFullBleed ? 'app-main app-main--full' : 'app-main'}>
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
