import React, { useState, useEffect } from 'react';
import { getMyBookings, cancelBooking } from '../../services/bookingService';
import { Link } from 'react-router-dom';

const MyBookings = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');

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
                alert('✅ Booking cancelledd successfully!');
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

    const filteredBookings = filter === 'ALL' 
        ? bookings 
        : bookings.filter(b => b.status === filter);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading your bookings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">📖 My Bookings</h1>
                    <p className="text-gray-500 text-sm mt-1">View and manage your booking requests</p>
                </div>
                <Link
                    to="/bookings/new"
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                >
                    + New Booking
                </Link>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6 border-b pb-2">
                {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                            filter === status 
                                ? 'bg-blue-500 text-white'
                                : 'text-gray-600 hover:text-gray-800'
                        }`}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {bookings.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                    <div className="text-5xl mb-3">📭</div>
                    <p className="text-gray-500 mb-4">You have no bookings yet.</p>
                    <Link
                        to="/bookings/new"
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                    >
                        Make a Booking
                    </Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredBookings.map((booking, index) => (
                        <div key={booking.id} className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow">
                            <div className="flex flex-wrap justify-between items-start gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="text-lg font-semibold text-gray-800">#{index + 1}</span>
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(booking.status)}`}>
                                            {getStatusIcon(booking.status)} {booking.status}
                                        </span>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <span className="text-gray-500">Resource:</span>
                                            <span className="ml-2 font-medium text-gray-800">{booking.resourceId}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Date:</span>
                                            <span className="ml-2 text-gray-700">{new Date(booking.startTime).toLocaleDateString()}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Time:</span>
                                            <span className="ml-2 text-gray-700">
                                                {new Date(booking.startTime).toLocaleTimeString()} - {new Date(booking.endTime).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Attendees:</span>
                                            <span className="ml-2 text-gray-700">{booking.expectedAttendees}</span>
                                        </div>
                                        <div className="md:col-span-2">
                                            <span className="text-gray-500">Purpose:</span>
                                            <span className="ml-2 text-gray-700">{booking.purpose}</span>
                                        </div>
                                        {booking.adminReason && (
                                            <div className="md:col-span-2">
                                                <span className="text-gray-500">Admin Note:</span>
                                                <span className="ml-2 text-gray-600 italic">{booking.adminReason}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <div>
                                    {booking.status === 'APPROVED' && (
                                        <button
                                            onClick={() => handleCancel(booking.id)}
                                            className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                                        >
                                            Cancel Booking
                                        </button>
                                    )}
                                    {booking.status === 'PENDING' && (
                                        <div className="text-yellow-600 text-sm text-center">Waiting for approval</div>
                                    )}
                                    {booking.status === 'REJECTED' && (
                                        <div className="text-red-600 text-sm text-center">Booking rejected</div>
                                    )}
                                    {booking.status === 'CANCELLED' && (
                                        <div className="text-gray-500 text-sm text-center">Booking cancelled</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyBookings;