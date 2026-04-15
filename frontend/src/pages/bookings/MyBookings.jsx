
import React, { useState, useEffect } from 'react';
import { getMyBookings, cancelBooking } from '../../services/bookingService';
import { Link } from 'react-router-dom';

const MyBookings = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

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

    const handleCancel = async (id) => {
        if (window.confirm('Are you sure you want to cancel this booking?')) {
            try {
                await cancelBooking(id);
                alert('✅ Booking cancelled successfully!');
                loadMyBookings();
            } catch (error) {
                alert('❌ Failed to cancel booking');
            }
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
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">📖 My Bookings</h1>
                <Link
                    to="/bookings/new"
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                    + New Booking
                </Link>
            </div>

            {bookings.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                    <div className="text-6xl mb-4">📅</div>
                    <p className="text-gray-500 mb-4">You have no bookings yet.</p>
                    <Link
                        to="/bookings/new"
                        className="inline-block bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                    >
                        Make a Booking
                    </Link>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resource</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Time</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purpose</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendees</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin Reason</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {bookings.map((booking) => (
                                    <tr key={booking.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {booking.resourceId}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {new Date(booking.startTime).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {new Date(booking.endTime).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                                            {booking.purpose}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {booking.expectedAttendees}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(booking.status)}`}>
                                                {getStatusIcon(booking.status)} {booking.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                            {booking.adminReason || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {booking.status === 'APPROVED' && (
                                                <button
                                                    onClick={() => handleCancel(booking.id)}
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