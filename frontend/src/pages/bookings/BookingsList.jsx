import React, { useState, useEffect } from 'react';
import { AlertTriangle, BarChart3, CheckCircle2, Clock3, Filter, ListChecks, XCircle } from 'lucide-react';
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
            case 'PENDING': return 'border border-amber-200 bg-amber-50 text-amber-700';
            case 'WAITLISTED': return 'border border-blue-200 bg-blue-50 text-blue-700';
            case 'APPROVED': return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
            case 'REJECTED': return 'border border-rose-200 bg-rose-50 text-rose-700';
            case 'CANCELLED': return 'border border-slate-200 bg-slate-100 text-slate-700';
            default: return 'border border-slate-200 bg-slate-100 text-slate-600';
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

    const statusOptions = ['ALL', 'PENDING', 'WAITLISTED', 'APPROVED', 'REJECTED', 'CANCELLED'];

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
                <div className="text-sm font-medium text-slate-500">Loading bookings...</div>
            </div>
        );
    }

    return (
        <div className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5">
            {toast && (
                <div className="fixed right-6 top-24 z-50">
                    <div
                        className={`rounded-lg px-4 py-3 shadow-lg border text-sm font-medium ${
                            toast.type === 'error'
                                ? 'border-red-200 bg-red-50 text-red-700'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        }`}
                    >
                        {toast.message}
                    </div>
                </div>
            )}

            {rejectDialog.open && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]">
                    <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
                        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-900 px-6 py-4 text-white">
                            <h3 className="inline-flex items-center gap-2 text-lg font-semibold">
                                <AlertTriangle className="h-5 w-5 text-amber-300" />
                                Reject Booking
                            </h3>
                            <p className="mt-1 text-sm text-slate-200">Provide a clear reason so the requester understands what to update.</p>
                        </div>

                        <div className="space-y-4 px-6 py-5">
                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                                This note will be visible to the requester in booking status updates.
                            </div>

                            <label className="block text-sm font-semibold text-slate-700" htmlFor="reject-reason">
                                Rejection reason
                            </label>
                        <textarea
                            id="reject-reason"
                            value={rejectDialog.reason}
                            onChange={(e) => setRejectDialog(prev => ({ ...prev, reason: e.target.value }))}
                            rows={5}
                            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                            placeholder="Explain why this booking cannot be approved and what can be adjusted."
                        />

                            <div className="flex items-center justify-between text-xs text-slate-500">
                                <span>Minimum recommendation: 10+ characters</span>
                                <span>{rejectDialog.reason.trim().length} characters</span>
                            </div>

                            <div className="mt-1 flex flex-wrap justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={closeRejectDialog}
                                    className="inline-flex h-11 w-32 items-center justify-center rounded-xl border border-slate-300 bg-slate-100 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={submitReject}
                                    disabled={!rejectDialog.reason.trim()}
                                    className="inline-flex h-11 w-32 items-center justify-center rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
                                >
                                    Confirm Reject
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="inline-flex items-center gap-2 text-xl font-bold text-slate-900 sm:text-2xl">
                        <ListChecks className="h-6 w-6 text-cyan-700" />
                        Booking Management
                    </h2>
                    <button
                        onClick={() => setShowStats(!showStats)}
                        className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-700 transition-colors hover:bg-cyan-100"
                    >
                        <BarChart3 className="h-4 w-4" />
                        {showStats ? 'Hide Statistics' : 'Show Statistics'}
                    </button>
                </div>
            </div>

            {showStats && statistics && (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">Total</p>
                        <p className="mt-1 text-2xl font-bold text-cyan-900">{statistics.total}</p>
                    </div>
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">Pending</p>
                        <p className="mt-1 text-2xl font-bold text-amber-900">{statistics.pending}</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Approved</p>
                        <p className="mt-1 text-2xl font-bold text-emerald-900">{statistics.approved}</p>
                    </div>
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">Rejected</p>
                        <p className="mt-1 text-2xl font-bold text-rose-900">{statistics.rejected}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Cancelled</p>
                        <p className="mt-1 text-2xl font-bold text-slate-800">{statistics.cancelled}</p>
                    </div>
                </div>
            )}

            {!showStats && statistics && (
                <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-xs text-slate-500">Total</p>
                        <p className="text-lg font-bold text-slate-900">{statistics.total}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-xs text-slate-500">Pending</p>
                        <p className="text-lg font-bold text-amber-700">{statistics.pending}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-xs text-slate-500">Approved</p>
                        <p className="text-lg font-bold text-emerald-700">{statistics.approved}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-xs text-slate-500">Rejected</p>
                        <p className="text-lg font-bold text-rose-700">{statistics.rejected}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-xs text-slate-500">Cancelled</p>
                        <p className="text-lg font-bold text-slate-700">{statistics.cancelled}</p>
                    </div>
                </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    <Filter className="h-4 w-4" />
                    Filter by status
                </div>
                <div className="flex flex-wrap gap-2">
                    {statusOptions.map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-all sm:text-sm ${
                                filter === status
                                    ? 'border-cyan-200 bg-cyan-50 text-cyan-700'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                            }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-[1100px] w-full table-fixed">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="w-[9%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Resource</th>
                                <th className="w-[11%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Location</th>
                                <th className="w-[11%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">User</th>
                                <th className="w-[13%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Start Time</th>
                                <th className="w-[13%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">End Time</th>
                                <th className="w-[13%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Purpose</th>
                                <th className="w-[8%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Attendees</th>
                                <th className="w-[9%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                                <th className="w-[13%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredBookings.map((booking) => (
                                <tr key={booking.id} className="hover:bg-slate-50/70">
                                    <td className="px-4 py-4 text-sm font-medium text-slate-900 break-words">{booking.resourceId}</td>
                                    <td className="px-4 py-4 text-sm text-slate-700 break-words">{booking.location || '-'}</td>
                                    <td className="px-4 py-4 text-sm text-slate-700 break-words">{booking.userName}</td>
                                    <td className="px-4 py-4 text-sm leading-tight text-slate-700 break-words">
                                        {formatDateTime(booking.startTime)}
                                    </td>
                                    <td className="px-4 py-4 text-sm leading-tight text-slate-700 break-words">
                                        {formatDateTime(booking.endTime)}
                                    </td>
                                    <td className="px-4 py-4 text-sm text-slate-700 break-words">{booking.purpose}</td>
                                    <td className="px-4 py-4 text-sm text-slate-700">{booking.expectedAttendees}</td>
                                    <td className="px-4 py-4 align-top">
                                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusColor(booking.status)}`}>
                                            {booking.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 align-top text-sm">
                                        {booking.status === 'PENDING' && (
                                            <div className="flex flex-wrap gap-1.5">
                                                <button
                                                    onClick={() => handleApprove(booking.id)}
                                                    className="inline-flex w-24 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                                                >
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => openRejectDialog(booking.id)}
                                                    className="inline-flex w-24 items-center justify-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-rose-700"
                                                >
                                                    <XCircle className="h-3.5 w-3.5" />
                                                    Reject
                                                </button>
                                            </div>
                                        )}
                                        {booking.status !== 'PENDING' && (
                                            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                                                <Clock3 className="h-3.5 w-3.5" />
                                                No action
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredBookings.length === 0 && (
                    <div className="py-10 text-center text-sm text-slate-500">
                        No bookings found for this filter.
                    </div>
                )}
            </div>
        </div>
    );
};

export default BookingsList;