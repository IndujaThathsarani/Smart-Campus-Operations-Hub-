
import React, { useState, useEffect } from 'react';
import { Ban, CalendarClock, CheckCircle2, Clock3, Hourglass, ListChecks, XCircle } from 'lucide-react';
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
            case 'PENDING': return 'border border-amber-200 bg-amber-50 text-amber-700';
            case 'WAITLISTED': return 'border border-blue-200 bg-blue-50 text-blue-700';
            case 'APPROVED': return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
            case 'REJECTED': return 'border border-rose-200 bg-rose-50 text-rose-700';
            case 'CANCELLED': return 'border border-slate-200 bg-slate-100 text-slate-700';
            default: return 'border border-slate-200 bg-slate-100 text-slate-600';
        }
    };

    const getStatusIcon = (status) => {
        switch(status) {
            case 'PENDING': return <Hourglass className="h-3.5 w-3.5" />;
            case 'WAITLISTED': return <Clock3 className="h-3.5 w-3.5" />;
            case 'APPROVED': return <CheckCircle2 className="h-3.5 w-3.5" />;
            case 'REJECTED': return <XCircle className="h-3.5 w-3.5" />;
            case 'CANCELLED': return <Ban className="h-3.5 w-3.5" />;
            default: return <ListChecks className="h-3.5 w-3.5" />;
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
                <div className="text-sm font-medium text-slate-500">Loading your bookings...</div>
            </div>
        );
    }

    return (
        <div className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5">
            {message && (
                <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
                    <div className={`rounded-xl px-6 py-4 text-base font-semibold shadow-xl border ${
                        message.type === 'error'
                            ? 'border-red-200 bg-red-50 text-red-700'
                            : 'border-green-200 bg-green-50 text-green-700'
                    }`}>
                        {message.text}
                    </div>
                </div>
            )}

            {cancelDialog.open && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                        <h2 className="text-xl font-bold text-slate-900">Cancel Booking</h2>
                        <p className="mt-2 text-sm text-slate-600">
                            Are you sure you want to cancel this approved booking?
                        </p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={closeCancelDialog}
                                className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
                            >
                                No, Keep It
                            </button>
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
                            >
                                Yes, Cancel Booking
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="inline-flex items-center gap-2 text-xl font-bold text-slate-900 sm:text-2xl">
                    <CalendarClock className="h-6 w-6 text-cyan-700" />
                    My Bookings
                </h2>
                <p className="mt-1 text-sm text-slate-600">Track approvals, waitlist promotions, and any admin feedback on your requests.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs text-amber-700">Pending</p>
                    <p className="text-lg font-bold text-amber-900">{bookings.filter((b) => b.status === 'PENDING').length}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-xs text-emerald-700">Approved</p>
                    <p className="text-lg font-bold text-emerald-900">{bookings.filter((b) => b.status === 'APPROVED').length}</p>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                    <p className="text-xs text-blue-700">Waitlisted</p>
                    <p className="text-lg font-bold text-blue-900">{bookings.filter((b) => b.status === 'WAITLISTED').length}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-100 p-3">
                    <p className="text-xs text-slate-600">Total</p>
                    <p className="text-lg font-bold text-slate-900">{bookings.length}</p>
                </div>
            </div>

            {bookings.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center shadow-sm">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                        <CalendarClock className="h-7 w-7 text-slate-500" />
                    </div>
                    <p className="text-sm text-slate-500">You have no bookings yet.</p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-[1150px] w-full table-fixed">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="w-[10%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Resource</th>
                                    <th className="w-[12%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Location</th>
                                    <th className="w-[14%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Start Time</th>
                                    <th className="w-[14%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">End Time</th>
                                    <th className="w-[14%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Purpose</th>
                                    <th className="w-[8%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Attendees</th>
                                    <th className="w-[10%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                                    <th className="w-[10%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Admin Reason</th>
                                    <th className="w-[8%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {bookings.map((booking) => (
                                    <tr key={booking.id} className="hover:bg-slate-50/70">
                                        <td className="px-4 py-4 text-sm font-medium text-slate-900 break-words">
                                            {booking.resourceId}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-slate-700 break-words">
                                            {booking.location || '-'}
                                        </td>
                                        <td className="px-4 py-4 text-sm leading-tight text-slate-700 break-words">
                                            {new Date(booking.startTime).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-4 text-sm leading-tight text-slate-700 break-words">
                                            {new Date(booking.endTime).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-slate-700 break-words">
                                            {booking.purpose}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-slate-700">
                                            {booking.expectedAttendees}
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusColor(booking.status)}`}>
                                                {getStatusIcon(booking.status)} {booking.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-slate-500 break-words">
                                            {booking.adminReason || '-'}
                                        </td>
                                        <td className="px-4 py-4 text-sm break-words">
                                            {booking.status === 'APPROVED' && (
                                                <button
                                                    onClick={() => openCancelDialog(booking.id)}
                                                    className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-rose-700"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                            {booking.status === 'PENDING' && (
                                                <span className="text-xs text-amber-700">Waiting for approval</span>
                                            )}
                                            {booking.status === 'WAITLISTED' && (
                                                <span className="text-xs text-blue-700">On waitlist</span>
                                            )}
                                            {booking.status === 'REJECTED' && (
                                                <span className="text-xs text-rose-700">Booking rejected</span>
                                            )}
                                            {booking.status === 'CANCELLED' && (
                                                <span className="text-xs text-slate-600">Booking cancelled</span>
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