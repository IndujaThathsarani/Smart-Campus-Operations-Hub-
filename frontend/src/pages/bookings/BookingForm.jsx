import React, { useEffect, useState } from 'react';
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
            <div className="min-h-[70vh] flex items-center justify-center bg-[#f3f4f6] p-6">
                <div className="w-full max-w-xl rounded-3xl bg-[#111827] p-10 text-center shadow-lg border border-blue-500/20">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-4xl text-blue-600">
                        ✓
                    </div>
                    <h2 className="mb-3 text-4xl font-extrabold text-white">
                        {isWaitlisted ? 'Added to Waitlist!' : 'Booking Confirmed!'}
                    </h2>
                    <p className="mx-auto mb-8 max-w-md text-base text-white/90">
                        {isWaitlisted
                            ? 'Your slot is already taken, so your request has been added to the waitlist. You will be notified if it gets promoted.'
                            : 'Your booking request has been placed successfully. Click the button below to view My Bookings.'}
                    </p>
                    <button
                        type="button"
                        onClick={() => navigate('/bookings?tab=my')}
                        className="rounded-xl bg-blue-600 px-8 py-3 text-base font-semibold text-white shadow hover:bg-blue-700"
                    >
                        {isWaitlisted ? 'View My Waitlist Booking' : 'Go to My Bookings'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-md p-6">
                <h1 className="text-2xl font-bold mb-6">📅 Request a Booking</h1>

                {error && (
                    <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 border border-red-200">
                        {error}
                    </div>
                )}

                {conflictError && (
                    <div className="bg-yellow-100 text-yellow-700 p-3 rounded-lg mb-4 border border-yellow-200">
                        {conflictError}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 font-medium mb-2">Resource ID *</label>
                        <input
                            type="text"
                            name="resourceId"
                            value={formData.resourceId}
                            onChange={handleChange}
                            onBlur={checkForConflict}
                            required
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., RES-001"
                        />
                        <p className="text-xs text-gray-500 mt-1">Enter the resource ID you want to book</p>
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 font-medium mb-2">Location</label>
                        <input
                            type="text"
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Location will auto-fill from selected resource"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Start Time *</label>
                            <input
                                type="datetime-local"
                                name="startTime"
                                value={formData.startTime}
                                onChange={handleChange}
                                onBlur={checkForConflict}
                                min={getMinDateTime()}
                                required
                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">End Time *</label>
                            <input
                                type="datetime-local"
                                name="endTime"
                                value={formData.endTime}
                                onChange={handleChange}
                                onBlur={checkForConflict}
                                min={formData.startTime || getMinDateTime()}
                                required
                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 font-medium mb-2">Purpose *</label>
                        <textarea
                            name="purpose"
                            value={formData.purpose}
                            onChange={handleChange}
                            required
                            rows="3"
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Describe the purpose of this booking"
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-gray-700 font-medium mb-2">Expected Attendees</label>
                        <input
                            type="number"
                            name="expectedAttendees"
                            value={formData.expectedAttendees}
                            onChange={handleChange}
                            min="1"
                            max="500"
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
                        >
                            {loading ? 'Submitting...' : 'Submit Booking Request'}
                        </button>
                        {conflictError && (
                            <button
                                type="button"
                                onClick={handleJoinWaitlist}
                                disabled={loading}
                                className="flex-1 bg-amber-500 text-white py-2 rounded-lg hover:bg-amber-600 disabled:bg-gray-400 transition-colors"
                            >
                                {loading ? 'Joining...' : 'Join Waitlist'}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => navigate(initialReturnTo || '/bookings?tab=my')}
                            className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>

                <div className="mt-6 p-3 bg-blue-50 rounded-lg text-sm text-gray-600">
                    <strong>📌 Note:</strong> Bookings will be reviewed by admin. You will receive a notification when your booking is approved or rejected.
                </div>
            </div>
        </div>
    );
};

export default BookingForm;