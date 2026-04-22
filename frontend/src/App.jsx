import { BrowserRouter, Route, Routes } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import ProtectedRoute from './routes/ProtectedRoute'
import HomePage from './pages/HomePage'
import Catalogue from './pages/resources/Catalogue'
import AdminCatalogue from './pages/resources/AdminCatalogue'
import BookingsPage from './pages/bookings/BookingsPage'
import TicketCreatePage from './pages/tickets/TicketCreatePage'
import TicketsListPage from './pages/tickets/TicketsListPage'
import AdminTicketsPage from './pages/tickets/AdminTicketsPage'
import NotificationsPage from './pages/notifications/NotificationsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="resources" element={<Catalogue />} />
            <Route path="admin/catalogue" element={<AdminCatalogue />} />
            <Route path="bookings" element={<BookingsPage />} />
            <Route path="tickets" element={<TicketsListPage />} />
            <Route path="tickets/new" element={<TicketCreatePage />} />
            <Route path="admin/tickets" element={<AdminTicketsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
