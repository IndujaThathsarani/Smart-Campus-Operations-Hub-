import { Link } from 'react-router-dom'

export default function AdminNavbar() {
  return (
    <header className="border-b border-white/10 bg-slate-950 text-slate-100 shadow-[0_1px_0_rgba(255,255,255,0.06)]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <span className="font-semibold tracking-[0.02em]">{'Admin · Incident & maintenance'}</span>
        <nav className="flex flex-wrap gap-1" aria-label="Admin navigation">
          <Link to="/tickets" className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-white/8 hover:text-white">
            User tickets
          </Link>
          <Link to="/resources" className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-white/8 hover:text-white">
            Resources
          </Link>
          <Link to="/bookings" className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-white/8 hover:text-white">
            Bookings
          </Link>
          <Link to="/notifications" className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-white/8 hover:text-white">
            Notifications
          </Link>
        </nav>
      </div>
    </header>
  )
}
