export function resolveNotificationTarget(notification, roles = []) {
  const type = String(notification?.type || '').toUpperCase()
  const entityType = String(notification?.entityType || '').toUpperCase()
  const roleList = Array.isArray(roles) ? roles : []

  const isBookingEvent =
    entityType === 'BOOKING' ||
    type.startsWith('BOOKING_') ||
    type === 'WAITLISTED' ||
    type === 'PROMOTED' ||
    type === 'APPROVED' ||
    type === 'REJECTED' ||
    type === 'CANCELLED'

  if (isBookingEvent) {
    return '/bookings'
  }

  const isTicketEvent =
    entityType === 'TICKET' ||
    type.startsWith('TICKET_')

  if (isTicketEvent) {
    if (roleList.includes('ROLE_SYSTEM_ADMIN') || roleList.includes('ROLE_ADMIN')) {
      return '/admin/tickets'
    }

    if (roleList.includes('ROLE_TECHNICIAN')) {
      return '/technician/tickets'
    }

    return '/tickets'
  }

  const isAccountEvent =
    entityType === 'USER' ||
    type === 'ACCOUNT_ROLE_CHANGED' ||
    type === 'ACCOUNT_STATUS_CHANGED'

  if (isAccountEvent) {
    return '/system-admin/dashboard'
  }

  return '/notifications'
}
