import React, { useState, useEffect } from 'react';
import { getAllBookings, approveBooking, rejectBooking, getBookingStatistics } from '../../services/bookingService';

const BookingsList = () => {
    const [bookings, setBookings] = useState([]);
    const [statistics, setStatistics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [popup, setPopup] = useState({ open: false, type: 'success', message: '' });

    useEffect(() => {
        loadBookings();
        loadStatistics();
    }, []);

    const loadBookings = async () => {
        try {
            const data = await getAllBookings();
            setBookings(data);
        } catch (error) {
            console.error('Error loading bookings:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadStatistics = async () => {
        try {
            const data = await getBookingStatistics();
            setStatistics(data);
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    };

    const showPopup = (type, message) => {
        setPopup({ open: true, type, message });
    };

    useEffect(() => {
        if (!popup.open) return;
        const timer = setTimeout(() => {
            setPopup(prev => ({ ...prev, open: false }));
        }, 2400);
        return () => clearTimeout(timer);
    }, [popup.open]);

    const handleApprove = async (id) => {
        try {
            await approveBooking(id, 'Approved by admin');
            loadBookings();
            loadStatistics();
            showPopup('success', 'Booking approved successfully.');
        } catch (error) {
            showPopup('error', 'Failed to approve booking.');
        }
    };

    const handleReject = async (id) => {
        const reason = prompt('Enter rejection reason:');
        if (reason !== null) {
            try {
                await rejectBooking(id, reason || 'Rejected by admin');
                loadBookings();
                loadStatistics();
                showPopup('success', 'Booking rejected successfully.');
            } catch (error) {
                showPopup('error', 'Failed to reject booking.');
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

    const filteredBookings = bookings
        .filter(b => filter === 'ALL' || b.status === filter)
        .filter(b => 
            b.resourceId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.purpose?.toLowerCase().includes(searchTerm.toLowerCase())
        );

    // Stat Card Component
    const StatCard = ({ title, value, icon, color, bgColor }) => (
        <div className={`bg-white rounded-xl shadow-sm p-5 border-l-4 ${color} hover:shadow-md transition-shadow`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-500 text-sm font-medium">{title}</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">{value || 0}</p>
                </div>
                <div className={`w-12 h-12 ${bgColor} rounded-full flex items-center justify-center text-2xl`}>
                    {icon}
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading bookings...</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            {popup.open && (
                <div className="fixed top-4 right-4 z-50">
                    <div
                        className={`min-w-64 max-w-md rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
                            popup.type === 'success'
                                ? 'bg-green-600 text-white'
                                : 'bg-red-600 text-white'
                        }`}
                    >
                        {popup.message}
                    </div>
                </div>
            )}

            {/* Statistics Cards */}
            {statistics && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                    <StatCard title="Total Bookings" value={statistics.total} icon="📊" color="border-blue-500" bgColor="bg-blue-50" />
                    <StatCard title="Pending" value={statistics.pending} icon="⏳" color="border-yellow-500" bgColor="bg-yellow-50" />
                    <StatCard title="Approved" value={statistics.approved} icon="✅" color="border-green-500" bgColor="bg-green-50" />
                    <StatCard title="Rejected" value={statistics.rejected} icon="❌" color="border-red-500" bgColor="bg-red-50" />
                    <StatCard title="Cancelled" value={statistics.cancelled} icon="🚫" color="border-gray-500" bgColor="bg-gray-50" />
                </div>
            )}

            {/* Search and Filter Bar */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder="Search by resource ID, user, or purpose..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map(status => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                                    filter === status 
                                        ? 'bg-blue-500 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {status}
                                {status !== 'ALL' && statistics && (
                                    <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                                        filter === status ? 'bg-white text-blue-500' : 'bg-gray-300 text-gray-600'
                                    }`}>
                                        {status === 'PENDING' && statistics.pending}
                                        {status === 'APPROVED' && statistics.approved}
                                        {status === 'REJECTED' && statistics.rejected}
                                        {status === 'CANCELLED' && statistics.cancelled}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bookings Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Resource ID</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Purpose</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Attendees</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredBookings.map((booking, index) => (
                                <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-sm text-gray-500">{index + 1}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{booking.resourceId}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{booking.userName}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {new Date(booking.startTime).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {new Date(booking.startTime).toLocaleTimeString()} - {new Date(booking.endTime).toLocaleTimeString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{booking.purpose}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{booking.expectedAttendees}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(booking.status)}`}>
                                            {getStatusIcon(booking.status)} {booking.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {booking.status === 'PENDING' && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleApprove(booking.id)}
                                                    className="bg-green-500 text-white px-3 py-1 rounded-md text-xs hover:bg-green-600 transition-colors"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleReject(booking.id)}
                                                    className="bg-red-500 text-white px-3 py-1 rounded-md text-xs hover:bg-red-600 transition-colors"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        )}
                                        {booking.status === 'APPROVED' && (
                                            <span className="text-green-600 text-sm font-medium">✓ Approved</span>
                                        )}
                                        {booking.status === 'REJECTED' && (
                                            <span className="text-red-600 text-sm font-medium">✗ Rejected</span>
                                        )}
                                        {booking.status === 'CANCELLED' && (
                                            <span className="text-gray-500 text-sm">Cancelled</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredBookings.length === 0 && (
                    <div className="text-center py-12">
                        <div className="text-5xl mb-3">📭</div>
                        <p className="text-gray-500">No bookings found</p>
                    </div>
                )}
                <div className="bg-gray-50 px-6 py-3 border-t text-sm text-gray-500">
                    Showing {filteredBookings.length} of {bookings.length} bookings
                </div>
            </div>
        </div>
    );
};

export default BookingsList;