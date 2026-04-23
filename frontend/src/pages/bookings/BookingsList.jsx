import React, { useState, useEffect } from 'react';
import { getAllBookings, approveBooking, rejectBooking, getBookingStatistics } from '../../services/bookingService';

const BookingsList = () => {
    const [bookings, setBookings] = useState([]);
    const [statistics, setStatistics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const [showStats, setShowStats] = useState(false);
    const [toast, setToast] = useState(null);
    const [rejectDialog, setRejectDialog] = useState({
        open: false,
        bookingId: null,
        reason: ''
    });

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

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => {
            setToast(null);
        }, 2500);
    };

    const handleApprove = async (id) => {
        try {
            await approveBooking(id, 'Approved by admin');
            loadBookings();
            loadStatistics();
            showToast('Booking approved successfully.');
        } catch (error) {
            showToast('Failed to approve booking.', 'error');
        }
    };

    const handleReject = async (id, reason) => {
        try {
            await rejectBooking(id, reason);
            loadBookings();
            loadStatistics();
            showToast('Booking rejected successfully.');
        } catch (error) {
            showToast('Failed to reject booking.', 'error');
        }
    };

    const openRejectDialog = (bookingId) => {
        setRejectDialog({
            open: true,
            bookingId,
            reason: ''
        });
    };

    const closeRejectDialog = () => {
        setRejectDialog({
            open: false,
            bookingId: null,
            reason: ''
        });
    };

    const submitReject = async () => {
        const reason = rejectDialog.reason.trim();
        if (!reason || !rejectDialog.bookingId) {
            return;
        }
        await handleReject(rejectDialog.bookingId, reason);
        closeRejectDialog();
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

    const filteredBookings = filter === 'ALL' 
        ? bookings 
        : bookings.filter(b => b.status === filter);

    const formatDateTime = (value) => {
        return new Date(value).toLocaleString([], {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-gray-500">Loading bookings...</div>
            </div>
        );
    }

    return (
        <div className="p-6">
            {toast && (
                <div className="fixed right-6 top-24 z-50">
                    <div
                        className={`rounded-lg px-4 py-3 shadow-lg border text-sm font-medium ${
                            toast.type === 'error'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-green-50 text-green-700 border-green-200'
                        }`}
                    >
                        {toast.message}
                    </div>
                </div>
            )}

            {rejectDialog.open && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
                        <h3 className="text-lg font-semibold text-gray-900">Reject Booking</h3>
                        <p className="mt-1 text-sm text-gray-600">Type the reason for rejection.</p>
                        <textarea
                            value={rejectDialog.reason}
                            onChange={(e) => setRejectDialog(prev => ({ ...prev, reason: e.target.value }))}
                            rows={4}
                            className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            placeholder="Enter rejection reason..."
                        />
                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={closeRejectDialog}
                                className="rounded-lg bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={submitReject}
                                disabled={!rejectDialog.reason.trim()}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
                            >
                                Confirm Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">📋 Booking Management</h1>
                <button
                    onClick={() => setShowStats(!showStats)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                    {showStats ? 'Hide Statistics' : 'Show Statistics'}
                </button>
            </div>

            {/* Statistics Section */}
            {showStats && statistics && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">📊 Booking Statistics</h2>
                    <div className="grid grid-cols-5 gap-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{statistics.total}</div>
                            <div className="text-sm text-gray-600">Total</div>
                        </div>
                        <div className="text-center p-3 bg-yellow-50 rounded-lg">
                            <div className="text-2xl font-bold text-yellow-600">{statistics.pending}</div>
                            <div className="text-sm text-gray-600">Pending</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">{statistics.approved}</div>
                            <div className="text-sm text-gray-600">Approved</div>
                        </div>
                        <div className="text-center p-3 bg-red-50 rounded-lg">
                            <div className="text-2xl font-bold text-red-600">{statistics.rejected}</div>
                            <div className="text-sm text-gray-600">Rejected</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <div className="text-2xl font-bold text-gray-600">{statistics.cancelled}</div>
                            <div className="text-sm text-gray-600">Cancelled</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-4 border-b">
                {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-4 py-2 -mb-px transition-colors ${
                            filter === status 
                                ? 'border-b-2 border-blue-500 text-blue-600 font-medium'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {/* Bookings Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-hidden">
                    <table className="w-full table-fixed">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="w-[9%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resource</th>
                                <th className="w-[11%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                <th className="w-[11%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                <th className="w-[13%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                                <th className="w-[13%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Time</th>
                                <th className="w-[13%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purpose</th>
                                <th className="w-[8%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendees</th>
                                <th className="w-[9%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="w-[13%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredBookings.map((booking) => (
                                <tr key={booking.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-4 text-sm text-gray-900 break-words">{booking.resourceId}</td>
                                    <td className="px-4 py-4 text-sm text-gray-900 break-words">{booking.location || '-'}</td>
                                    <td className="px-4 py-4 text-sm text-gray-900 break-words">{booking.userName}</td>
                                    <td className="px-4 py-4 text-sm text-gray-900 leading-tight break-words">
                                        {formatDateTime(booking.startTime)}
                                    </td>
                                    <td className="px-4 py-4 text-sm text-gray-900 leading-tight break-words">
                                        {formatDateTime(booking.endTime)}
                                    </td>
                                    <td className="px-4 py-4 text-sm text-gray-900 break-words">{booking.purpose}</td>
                                    <td className="px-4 py-4 text-sm text-gray-900">{booking.expectedAttendees}</td>
                                    <td className="px-4 py-4 align-top">
                                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getStatusColor(booking.status)}`}>
                                            {booking.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 align-top text-sm">
                                        {booking.status === 'PENDING' && (
                                            <div className="flex flex-wrap gap-1">
                                                <button
                                                    onClick={() => handleApprove(booking.id)}
                                                    className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600 transition-colors"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => openRejectDialog(booking.id)}
                                                    className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 transition-colors"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        )}
                                        {booking.status !== 'PENDING' && (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredBookings.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        No bookings found
                    </div>
                )}
            </div>
        </div>
    );
};

export default BookingsList;