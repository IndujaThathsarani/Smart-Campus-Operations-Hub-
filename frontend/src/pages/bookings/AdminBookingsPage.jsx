import BookingsList from './BookingsList'

export default function AdminBookingsPage() {
  return (
    <section>
      <header className="admin-overview-header">
        <h2>Booking Control</h2>
        <p>Approve, reject, and monitor campus resource requests from the dedicated admin workspace.</p>
      </header>
      <BookingsList />
    </section>
  )
}
