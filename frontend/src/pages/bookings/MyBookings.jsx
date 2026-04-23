
import React, { useState, useEffect } from 'react';
import { getMyBookings, cancelBooking } from '../../services/bookingService';

const MyBookings = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cancelDialog, setCancelDialog] = useState({ open: false, bookingId: null });
    const [message, setMessage] = useState(null);

    useEffect(() => {
        loadMyBookings();
    }, []);

    const loadMyBookings = async () => {
        try {
            const data = await getMyBookings();
            setBookings(data);
        } catch (error) {
            console.error('Error loading bookings:', error);
        } finally {
            setLoading(false);
        }
    };

    const openCancelDialog = (bookingId) => {
        setCancelDialog({ open: true, bookingId });
    };

    const closeCancelDialog = () => {
        setCancelDialog({ open: false, bookingId: null });
    };

    const showMessage = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 2200);
    };

    const handleCancel = async () => {
        if (!cancelDialog.bookingId) return;

        try {
            await cancelBooking(cancelDialog.bookingId);
            closeCancelDialog();
            showMessage('Booking cancelled successfully.', 'success');
            loadMyBookings();
        } catch (error) {
            closeCancelDialog();
            showMessage('Failed to cancel booking.', 'error');
        }
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'PENDING': return 'bg-yellow-100 text-yellow-800';
            case 'APPROVED': return 'bg-green-100 text-green-800';
            case 'REJECTED': return 'bg-red-100 text-red-800';
            case 'CANCELLED': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100';
        }
    };

    const getStatusIcon = (status) => {
        switch(status) {
            case 'PENDING': return '⏳';
            case 'APPROVED': return '✅';
            case 'REJECTED': return '❌';
            case 'CANCELLED': return '🚫';
            default: return '📋';
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-gray-500">Loading your bookings...</div>
            </div>
        );
    }

    return (
        <div className="p-6">
            {message && (
                <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
                    <div className={`rounded-xl px-6 py-4 text-base font-semibold shadow-xl border ${
                        message.type === 'error'
                            ? 'bg-red-50 border-red-200 text-red-700'
                            : 'bg-green-50 border-green-200 text-green-700'
                    }`}>
                        {message.text}
                    </div>
                </div>
            )}

            {cancelDialog.open && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                        <h2 className="text-xl font-bold text-gray-900">Cancel Booking</h2>
                        <p className="mt-2 text-sm text-gray-600">
                            Are you sure you want to cancel this approved booking?
                        </p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={closeCancelDialog}
                                className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
                            >
                                No, Keep It
                            </button>
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                            >
                                Yes, Cancel Booking
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="mb-6">
                <h1 className="text-2xl font-bold">📖 My Bookings</h1>
            </div>

            {bookings.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                    <div className="text-6xl mb-4">📅</div>
                    <p className="text-gray-500">You have no bookings yet.</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="overflow-hidden">
                        <table className="w-full table-fixed">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="w-[10%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resource</th>
                                    <th className="w-[12%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                    <th className="w-[14%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                                    <th className="w-[14%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Time</th>
                                    <th className="w-[14%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purpose</th>
                                    <th className="w-[8%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendees</th>
                                    <th className="w-[10%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="w-[10%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin Reason</th>
                                    <th className="w-[8%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {bookings.map((booking) => (
                                    <tr key={booking.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-4 text-sm font-medium text-gray-900 break-words">
                                            {booking.resourceId}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-900 break-words">
                                            {booking.location || '-'}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-900 break-words leading-tight">
                                            {new Date(booking.startTime).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-900 break-words leading-tight">
                                            {new Date(booking.endTime).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-900 break-words">
                                            {booking.purpose}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-900">
                                            {booking.expectedAttendees}
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(booking.status)}`}>
                                                {getStatusIcon(booking.status)} {booking.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-500 break-words">
                                            {booking.adminReason || '-'}
                                        </td>
                                        <td className="px-4 py-4 text-sm break-words">
                                            {booking.status === 'APPROVED' && (
                                                <button
                                                    onClick={() => openCancelDialog(booking.id)}
                                                    className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                            {booking.status === 'PENDING' && (
                                                <span className="text-yellow-600 text-xs">Waiting for approval</span>
                                            )}
                                            {booking.status === 'REJECTED' && (
                                                <span className="text-red-600 text-xs">Booking rejected</span>
                                            )}
                                            {booking.status === 'CANCELLED' && (
                                                <span className="text-gray-600 text-xs">Booking cancelled</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyBookings;