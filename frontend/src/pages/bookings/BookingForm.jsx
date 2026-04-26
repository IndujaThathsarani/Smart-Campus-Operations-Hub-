import React, { useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, Clock3, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createBooking, checkConflict } from '../../services/bookingService';

const BookingForm = ({ initialResourceId = '', initialLocation = '', initialReturnTo = '' }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [conflictError, setConflictError] = useState(null);
    const [bookingCreated, setBookingCreated] = useState(false);
    const [bookingResult, setBookingResult] = useState(null);
    const [formData, setFormData] = useState({
        resourceId: initialResourceId,
        location: initialLocation,
        startTime: '',
        endTime: '',
        purpose: '',
        expectedAttendees: 1
    });

    useEffect(() => {
        if (initialResourceId) {
            setFormData((prev) => ({ ...prev, resourceId: initialResourceId }));
            setConflictError(null);
            setError(null);
        }
    }, [initialResourceId]);

    useEffect(() => {
        setFormData((prev) => ({ ...prev, location: initialLocation }));
    }, [initialLocation]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        let finalValue = value;
        
        // Convert expectedAttendees to number
        if (name === 'expectedAttendees' && value !== '') {
            finalValue = parseInt(value, 10) || 1;
        }
        
        setFormData(prev => ({ ...prev, [name]: finalValue }));
        setConflictError(null);
        setError(null);
    };

    const checkForConflict = async () => {
        if (formData.resourceId && formData.startTime && formData.endTime) {
            try {
                const result = await checkConflict(formData.resourceId, formData.startTime, formData.endTime);
                if (result.hasConflict) {
                    setConflictError('⚠️ This time slot conflicts with an existing booking! Please choose a different time.');
                } else {
                    setConflictError(null);
                }
            } catch (err) {
                console.error('Conflict check failed:', err);
            }
        }
    };

    const submitBooking = async (isWaitlist = false) => {
        setLoading(true);
        setError(null);

        try {
            const result = await createBooking({ ...formData, waitlistRequested: isWaitlist });
            if (result.message) {
                setBookingResult({ status: result.status, message: result.message });
                setBookingCreated(true);
            }
        } catch (err) {
            if (err.body?.error === 'CONFLICT') {
                setConflictError('⚠️ This time slot is already booked. You can join the waitlist instead.');
            } else {
                setError(err.body?.message || '❌ Failed to create booking. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        submitBooking(false);
    };

    const handleJoinWaitlist = () => {
        submitBooking(true);
    };

    // Get min datetime (today)
    const getMinDateTime = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    };

    if (bookingCreated) {
        const isWaitlisted = bookingResult?.status === 'WAITLISTED';
        return (
            <div className="flex min-h-[70vh] items-center justify-center bg-slate-100/70 p-6">
                <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl sm:p-10">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-cyan-200 bg-cyan-50 text-cyan-700">
                        <CheckCircle2 className="h-11 w-11" />
                    </div>
                    <h2 className="mb-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">
                        {isWaitlisted ? 'Added to Waitlist!' : 'Booking Confirmed!'}
                    </h2>
                    <p className="mx-auto mb-8 max-w-md text-base text-slate-600">
                        {isWaitlisted
                            ? 'Your slot is already taken, so your request has been added to the waitlist. You will be notified if it gets promoted.'
                            : 'Your booking request has been placed successfully. Click the button below to view My Bookings.'}
                    </p>
                    <button
                        type="button"
                        onClick={() => navigate('/bookings?tab=my')}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-700 px-8 py-3 text-base font-semibold text-white shadow hover:bg-cyan-800"
                    >
                        <CalendarClock className="h-5 w-5" />
                        {isWaitlisted ? 'View My Waitlist Booking' : 'Go to My Bookings'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-3xl p-2 sm:p-4">
            <section className="mb-4 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-900 p-5 text-white shadow-lg sm:p-6">
                <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100">
                    <Clock3 className="h-3.5 w-3.5" />
                    Booking Request
                </p>
                <h1 className="text-2xl font-bold sm:text-3xl">Reserve a Campus Resource</h1>
                <p className="mt-2 text-sm text-slate-200 sm:text-base">
                    Submit your preferred time window and purpose. Admins will review and notify you after approval or rejection.
                </p>
            </section>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="mb-5 inline-flex items-center gap-2 text-lg font-bold text-slate-900">
                    <CalendarClock className="h-5 w-5 text-cyan-700" />
                    Request Details
                </h2>

                {error && (
                    <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {conflictError && (
                    <div className="mb-4 inline-flex w-full items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        {conflictError}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Resource ID *</label>
                        <input
                            type="text"
                            name="resourceId"
                            value={formData.resourceId}
                            onChange={handleChange}
                            onBlur={checkForConflict}
                            required
                            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                            placeholder="e.g., RES-001"
                        />
                        <p className="mt-1 text-xs text-slate-500">Enter the resource ID you want to book.</p>
                    </div>

                    <div className="mb-4">
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Location</label>
                        <input
                            type="text"
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                            placeholder="Location will auto-fill from selected resource"
                        />
                    </div>

                    <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Start Time *</label>
                            <input
                                type="datetime-local"
                                name="startTime"
                                value={formData.startTime}
                                onChange={handleChange}
                                onBlur={checkForConflict}
                                min={getMinDateTime()}
                                required
                                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">End Time *</label>
                            <input
                                type="datetime-local"
                                name="endTime"
                                value={formData.endTime}
                                onChange={handleChange}
                                onBlur={checkForConflict}
                                min={formData.startTime || getMinDateTime()}
                                required
                                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Purpose *</label>
                        <textarea
                            name="purpose"
                            value={formData.purpose}
                            onChange={handleChange}
                            required
                            rows="3"
                            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                            placeholder="Describe the purpose of this booking"
                        />
                    </div>

                    <div className="mb-6">
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Expected Attendees</label>
                        <input
                            type="number"
                            name="expectedAttendees"
                            value={formData.expectedAttendees}
                            onChange={handleChange}
                            min="1"
                            max="500"
                            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                        />
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-700 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-800 disabled:bg-slate-400"
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            {loading ? 'Submitting...' : 'Submit Booking Request'}
                        </button>
                        {conflictError && (
                            <button
                                type="button"
                                onClick={handleJoinWaitlist}
                                disabled={loading}
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:bg-slate-400"
                            >
                                <Clock3 className="h-4 w-4" />
                                {loading ? 'Joining...' : 'Join Waitlist'}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => navigate(initialReturnTo || '/bookings?tab=my')}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-300"
                        >
                            <Clock3 className="h-4 w-4" />
                            Cancel
                        </button>
                    </div>
                </form>

                <div className="mt-6 rounded-xl border border-cyan-100 bg-cyan-50 p-3 text-sm text-slate-700">
                    <p className="inline-flex items-start gap-2">
                        <Users className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" />
                        <span>
                            <strong>Note:</strong> Bookings are reviewed by admin. You will receive a notification once your request is approved or rejected.
                        </span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BookingForm;