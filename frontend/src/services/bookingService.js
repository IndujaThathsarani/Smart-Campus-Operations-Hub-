import { apiGet, apiSend } from './apiClient';

// Get all bookings (Admin)
export const getAllBookings = async () => {
    return await apiGet('/api/bookings');
};

// Get my bookings (User)
export const getMyBookings = async () => {
    return await apiGet('/api/bookings/me');
};

// Get booking by ID
export const getBookingById = async (id) => {
    return await apiGet(`/api/bookings/${id}`);
};

// Create booking
export const createBooking = async (bookingData) => {
    return await apiSend('/api/bookings', {
        method: 'POST',
        body: bookingData
    });
};

// Approve booking (Admin)
export const approveBooking = async (id, reason) => {
    return await apiSend(`/api/bookings/${id}/approve`, {
        method: 'PUT',
        body: { reason }
    });
};

// Reject booking (Admin)
export const rejectBooking = async (id, reason) => {
    return await apiSend(`/api/bookings/${id}/reject`, {
        method: 'PUT',
        body: { reason }
    });
};

// Cancel booking
export const cancelBooking = async (id) => {
    return await apiSend(`/api/bookings/${id}/cancel`, {
        method: 'PUT'
    });
};

// Get booking statistics (Admin)
export const getBookingStatistics = async () => {
    return await apiGet('/api/bookings/statistics');
};

// Filter bookings
export const filterBookings = async (params) => {
    const queryString = new URLSearchParams(params).toString();
    return await apiGet(`/api/bookings/filter?${queryString}`);
};

// Check conflict
export const checkConflict = async (resourceId, startTime, endTime) => {
    const queryString = new URLSearchParams({ resourceId, startTime, endTime }).toString();
    return await apiGet(`/api/bookings/check-conflict?${queryString}`);
};