import { Link } from 'react-router-dom'

export default function AdminOverviewPage() {
  return (
    <section>
      <header className="admin-overview-header">
        <h2>Overview</h2>
        <p>Manage operational workflows without mixing admin controls into the student experience.</p>
      </header>

      <div className="admin-overview-grid">
        <article className="admin-overview-card">
          <p className="admin-overview-label">Bookings</p>
          <p className="admin-overview-value">Pending Reviews</p>
          <Link to="/admin/bookings" className="admin-overview-link">
            Open Booking Control
          </Link>
        </article>

        <article className="admin-overview-card">
          <p className="admin-overview-label">Interface Split</p>
          <p className="admin-overview-value">Admin side is now separate</p>
          <p className="admin-overview-note">User pages remain under the top navigation app.</p>
        </article>
      </div>

      <div className="admin-overview-status-wrap" aria-hidden>
        <div className="admin-overview-status-arc"></div>
      </div>
    </section>
  )
}
