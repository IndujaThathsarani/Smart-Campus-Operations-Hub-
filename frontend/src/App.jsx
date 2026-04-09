import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import ProtectedRoute from './routes/ProtectedRoute'
import ResourcesPage from './pages/resources/ResourcesPage'
import BookingsPage from './pages/bookings/BookingsPage'
import TicketsPage from './pages/tickets/TicketsPage'
import NotificationsPage from './pages/notifications/NotificationsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Navigate to="/resources" replace />} />
            <Route path="resources" element={<ResourcesPage />} />
            <Route path="bookings" element={<BookingsPage />} />
            <Route path="tickets" element={<TicketsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
