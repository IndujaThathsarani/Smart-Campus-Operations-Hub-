import { Route, Routes } from "react-router-dom";

import MainLayout from "./layouts/MainLayout";
import ProtectedRoute from "./routes/ProtectedRoute";

import HomePage from "./pages/HomePage";
import AuthPage from "./pages/auth/AuthPage";
import Catalogue from "./pages/resources/Catalogue";
import AdminCatalogue from "./pages/resources/AdminCatalogue";
import BookingsPage from "./pages/bookings/BookingsPage";
import AdminBookingsPage from "./pages/bookings/AdminBookingsPage";
import TicketCreatePage from "./pages/tickets/TicketCreatePage";
import TicketsListPage from "./pages/tickets/TicketsListPage";
import AdminTicketsPage from "./pages/tickets/AdminTicketsPage";
import TechnicianTicketsDashboard from "./pages/tickets/TechnicianTicketsDashboard";
import NotificationsPage from "./pages/notifications/NotificationsPage";
import UnauthorizedPage from "./pages/auth/UnauthorizedPage";
import SystemAdminDashboard from "./pages/system-admin/SystemAdminDashboard";


export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />

        <Route
          path="/resources"
          element={
            <ProtectedRoute allowedRoles={["ROLE_USER", "ROLE_ADMIN", "ROLE_TECHNICIAN", "ROLE_SYSTEM_ADMIN"]}>
              <Catalogue />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/catalogue"
          element={
            <ProtectedRoute allowedRoles={["ROLE_ADMIN", "ROLE_SYSTEM_ADMIN"]}>
              <AdminCatalogue />
            </ProtectedRoute>
          }
        />

        <Route
  path="/system-admin/dashboard"
  element={
    <ProtectedRoute allowedRoles={["ROLE_SYSTEM_ADMIN"]}>
      <SystemAdminDashboard />
    </ProtectedRoute>
  }
/>

        <Route
          path="/bookings"
          element={
            <ProtectedRoute
              allowedRoles={[
                "ROLE_USER",
                "ROLE_ADMIN",
                "ROLE_SYSTEM_ADMIN",
              ]}
            >
              <BookingsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/bookings"
          element={
            <ProtectedRoute allowedRoles={["ROLE_ADMIN", "ROLE_SYSTEM_ADMIN"]}>
              <AdminBookingsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tickets"
          element={
            <ProtectedRoute
              allowedRoles={[
                "ROLE_USER",
                "ROLE_ADMIN",
                "ROLE_TECHNICIAN",
                "ROLE_SYSTEM_ADMIN",
              ]}
            >
              <TicketsListPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tickets/new"
          element={
            <ProtectedRoute
              allowedRoles={["ROLE_USER", "ROLE_ADMIN", "ROLE_SYSTEM_ADMIN"]}
            >
              <TicketCreatePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/technician/tickets"
          element={
            <ProtectedRoute
              allowedRoles={[
                "ROLE_TECHNICIAN",
                "ROLE_ADMIN",
                "ROLE_SYSTEM_ADMIN",
              ]}
            >
              <TechnicianTicketsDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/tickets"
          element={
            <ProtectedRoute allowedRoles={["ROLE_ADMIN", "ROLE_SYSTEM_ADMIN"]}>
              <AdminTicketsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute
              allowedRoles={[
                "ROLE_USER",
                "ROLE_TECHNICIAN",
                "ROLE_ADMIN",
                "ROLE_SYSTEM_ADMIN",
              ]}
            >
              <NotificationsPage />
            </ProtectedRoute>
          }
        />

        <Route path="/unauthorized" element={<UnauthorizedPage />} />
      </Route>
    </Routes>
  );
}