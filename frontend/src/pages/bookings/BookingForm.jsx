import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBooking, checkConflict } from '../../services/bookingService';

const BookingForm = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [conflictError, setConflictError] = useState(null);
    const [formData, setFormData] = useState({
        resourceId: '',
        startTime: '',
        endTime: '',
        purpose: '',
        expectedAttendees: 1
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const result = await createBooking(formData);
            if (result.message) {
                alert('✅ Booking request created successfully!');
                navigate('/bookings');
            }
        } catch (err) {
            if (err.body?.error === 'CONFLICT') {
                setError('❌ Time slot conflict! This resource is already booked for the selected time.');
            } else {
                setError(err.body?.message || '❌ Failed to create booking. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Get min datetime (today)
    const getMinDateTime = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    };

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
                            disabled={loading || conflictError}
                            className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
                        >
                            {loading ? 'Submitting...' : 'Submit Booking Request'}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/bookings')}
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