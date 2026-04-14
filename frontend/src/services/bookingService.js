
const API_URL = 'http://localhost:8081/api/bookings';

// Get all bookings
export const getAllBookings = async () => {
    const response = await fetch(API_URL);
    return response.json();
};

// Create booking
export const createBooking = async (bookingData) => {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
    });
    return response.json();
};

// Approve booking
export const approveBooking = async (id, reason) => {
    const response = await fetch(`${API_URL}/${id}/approve`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
    });
    return response.json();
};

// Reject booking
export const rejectBooking = async (id, reason) => {
    const response = await fetch(`${API_URL}/${id}/reject`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
    });
    return response.json();
};

// Cancel booking
export const cancelBooking = async (id) => {
    const response = await fetch(`${API_URL}/${id}/cancel`, {
        method: 'PUT',
    });
    return response.json();
};