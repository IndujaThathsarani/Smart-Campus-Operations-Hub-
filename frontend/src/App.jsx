import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import AdminLayout from './layouts/AdminLayout'
import ProtectedRoute from './routes/ProtectedRoute'
import ResourcesPage from './pages/resources/ResourcesPage'
import BookingForm from './pages/bookings/BookingForm'
import MyBookings from './pages/bookings/MyBookings'
import AdminBookingsPage from './pages/bookings/AdminBookingsPage'
import TicketCreatePage from './pages/tickets/TicketCreatePage'
import TicketsListPage from './pages/tickets/TicketsListPage'
import NotificationsPage from './pages/notifications/NotificationsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Navigate to="/resources" replace />} />
            <Route path="resources" element={<ResourcesPage />} />
            <Route path="bookings" element={<Navigate to="/bookings/mine" replace />} />
            <Route path="bookings/new" element={<BookingForm />} />
            <Route path="bookings/mine" element={<MyBookings />} />
            <Route path="tickets" element={<TicketsListPage />} />
            <Route path="tickets/new" element={<TicketCreatePage />} />
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>

          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/bookings" replace />} />
            <Route path="bookings" element={<AdminBookingsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
