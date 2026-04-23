import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBooking, checkConflict } from '../../services/bookingService';

const BookingForm = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [conflictError, setConflictError] = useState(null);
    const [success, setSuccess] = useState(false);
    
    const [formData, setFormData] = useState({
        resourceId: '',
        startTime: '',
        endTime: '',
        purpose: '',
        expectedAttendees: 1
    });

    const validateResourceId = (value) => {
        if (!value) return 'Resource ID is required';
        return '';
    };

    const validateDateTime = (start, end) => {
        const now = new Date();
        const startDate = new Date(start);
        const endDate = new Date(end);
        
        if (!start) return 'Start time is required';
        if (!end) return 'End time is required';
        if (startDate < now) return 'Start time cannot be in the past';
        if (endDate <= startDate) return 'End time must be after start time';
        
        const durationHours = (endDate - startDate) / (1000 * 60 * 60);
        if (durationHours > 4) return 'Booking cannot exceed 4 hours';
        if (durationHours < 0.5) return 'Booking must be at least 30 minutes';
        
        return '';
    };

    const validatePurpose = (value) => {
        if (!value) return 'Purpose is required';
        if (value.length < 5) return 'Please provide more details';
        return '';
    };

    const validateAttendees = (value) => {
        const num = parseInt(value);
        if (isNaN(num) || num < 1) return 'Minimum 1 attendee required';
        if (num > 200) return 'Maximum 200 attendees allowed';
        return '';
    };

    const validateForm = () => {
        const newErrors = {
            resourceId: validateResourceId(formData.resourceId),
            purpose: validatePurpose(formData.purpose),
            expectedAttendees: validateAttendees(formData.expectedAttendees),
            time: validateDateTime(formData.startTime, formData.endTime)
        };
        
        setErrors(newErrors);
        return Object.values(newErrors).every(error => error === '');
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
        setConflictError(null);
    };

    const handleBlur = (field) => {
        setTouched(prev => ({ ...prev, [field]: true }));
    };

    const checkForConflict = async () => {
        if (formData.resourceId && formData.startTime && formData.endTime) {
            try {
                const result = await checkConflict(formData.resourceId, formData.startTime, formData.endTime);
                if (result.hasConflict) {
                    setConflictError('⚠️ This time slot conflicts with an existing booking!');
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
        
        if (!validateForm()) {
            setTouched({ resourceId: true, purpose: true, expectedAttendees: true, time: true });
            return;
        }
        
        setLoading(true);
        
        try {
            const result = await createBooking({
                resourceId: formData.resourceId,
                startTime: formData.startTime,
                endTime: formData.endTime,
                purpose: formData.purpose,
                expectedAttendees: formData.expectedAttendees
            });
            
            if (result.message) {
                setSuccess(true);
                setTimeout(() => {
                    navigate('/bookings/mine');
                }, 2000);
            }
        } catch (err) {
            if (err.body?.error === 'CONFLICT') {
                setConflictError('❌ Time slot conflict! This resource is already booked.');
            } else {
                alert('Failed to create booking. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const getMinDateTime = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    };

    if (success) {
        return (
            <div className="flex justify-center items-center h-96">
                <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">✅</span>
                    </div>
                    <h2 className="text-xl font-bold text-green-700 mb-2">Booking Request Submitted!</h2>
                    <p className="text-gray-600">Your booking request has been sent for approval.</p>
                    <p className="text-gray-400 text-sm mt-4">Redirecting...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-3xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">📅 Request a Booking</h1>
                <p className="text-gray-500 text-sm mt-1">Fill in the details below to book a resource</p>
            </div>

            {/* Form Card */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <form onSubmit={handleSubmit} className="p-6">
                    {/* Resource Section */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Resource ID <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="resourceId"
                            value={formData.resourceId}
                            onChange={handleChange}
                            onBlur={() => handleBlur('resourceId')}
                            onBlurCapture={checkForConflict}
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                touched.resourceId && errors.resourceId 
                                    ? 'border-red-500 bg-red-50' 
                                    : 'border-gray-300'
                            }`}
                            placeholder="e.g., LAB-001, HALL-A"
                        />
                        {touched.resourceId && errors.resourceId && (
                            <p className="text-red-500 text-xs mt-1">{errors.resourceId}</p>
                        )}
                    </div>

                    {/* Time Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Start Time <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="datetime-local"
                                name="startTime"
                                value={formData.startTime}
                                onChange={handleChange}
                                onBlur={() => handleBlur('time')}
                                onBlurCapture={checkForConflict}
                                min={getMinDateTime()}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                End Time <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="datetime-local"
                                name="endTime"
                                value={formData.endTime}
                                onChange={handleChange}
                                onBlur={() => handleBlur('time')}
                                onBlurCapture={checkForConflict}
                                min={formData.startTime || getMinDateTime()}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {touched.time && errors.time && (
                        <p className="text-red-500 text-xs mt-1 mb-4">{errors.time}</p>
                    )}

                    {conflictError && (
                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
                            {conflictError}
                        </div>
                    )}

                    {/* Purpose */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Purpose <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            name="purpose"
                            value={formData.purpose}
                            onChange={handleChange}
                            onBlur={() => handleBlur('purpose')}
                            rows="3"
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                touched.purpose && errors.purpose 
                                    ? 'border-red-500 bg-red-50' 
                                    : 'border-gray-300'
                            }`}
                            placeholder="Describe the purpose of this booking..."
                        />
                        {touched.purpose && errors.purpose && (
                            <p className="text-red-500 text-xs mt-1">{errors.purpose}</p>
                        )}
                    </div>

                    {/* Attendees */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Expected Attendees <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            name="expectedAttendees"
                            value={formData.expectedAttendees}
                            onChange={handleChange}
                            onBlur={() => handleBlur('expectedAttendees')}
                            min="1"
                            max="200"
                            className={`w-40 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                touched.expectedAttendees && errors.expectedAttendees 
                                    ? 'border-red-500 bg-red-50' 
                                    : 'border-gray-300'
                            }`}
                        />
                        {touched.expectedAttendees && errors.expectedAttendees && (
                            <p className="text-red-500 text-xs mt-1">{errors.expectedAttendees}</p>
                        )}
                    </div>

                    {/* Info Note */}
                    <div className="mb-6 p-3 bg-blue-50 rounded-lg text-sm text-gray-600">
                        <strong>📌 Note:</strong> Bookings will be reviewed by admin. Maximum booking duration: 4 hours | Max attendees: 200
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={loading || conflictError}
                            className="flex-1 bg-blue-500 text-white py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Submitting...' : 'Submit Booking Request'}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/bookings/mine')}
                            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BookingForm;