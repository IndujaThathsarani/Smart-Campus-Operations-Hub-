import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import ProtectedRoute from './routes/ProtectedRoute'
import Catalogue from './pages/resources/Catalogue'
import AdminCatalogue from './pages/resources/AdminCatalogue'
import BookingsPage from './pages/bookings/BookingsPage'
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
            <Route path="resources" element={<Catalogue />} />
            <Route path="admin/catalogue" element={<AdminCatalogue />} />
            <Route path="bookings" element={<BookingsPage />} />
            <Route path="tickets" element={<TicketsListPage />} />
            <Route path="tickets/new" element={<TicketCreatePage />} />
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
