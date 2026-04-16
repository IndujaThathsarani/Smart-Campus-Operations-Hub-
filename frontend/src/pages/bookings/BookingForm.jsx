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
        resourceName: '',
        startTime: '',
        endTime: '',
        purpose: '',
        expectedAttendees: 1,
        contactEmail: '',
        contactPhone: '',
        specialRequests: ''
    });

    // Validation functions
    const validateResourceId = (value) => {
        if (!value) return 'Resource ID is required';
        if (!/^[A-Za-z0-9\-_]{3,20}$/.test(value)) {
            return 'Resource ID must be 3-20 characters (letters, numbers, -, _)';
        }
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
        if (value.length < 10) return 'Please provide more details (min 10 characters)';
        if (value.length > 500) return 'Purpose cannot exceed 500 characters';
        return '';
    };

    const validateAttendees = (value) => {
        const num = parseInt(value);
        if (isNaN(num) || num < 1) return 'Minimum 1 attendee required';
        if (num > 200) return 'Maximum 200 attendees allowed';
        return '';
    };

    const validateEmail = (value) => {
        if (!value) return ''; // Optional
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Please enter a valid email address';
        return '';
    };

    const validatePhone = (value) => {
        if (!value) return ''; // Optional
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(value)) return 'Please enter a valid 10-digit phone number';
        return '';
    };

    const validateForm = () => {
        const newErrors = {
            resourceId: validateResourceId(formData.resourceId),
            startTime: validateDateTime(formData.startTime, formData.endTime),
            purpose: validatePurpose(formData.purpose),
            expectedAttendees: validateAttendees(formData.expectedAttendees),
            contactEmail: validateEmail(formData.contactEmail),
            contactPhone: validatePhone(formData.contactPhone)
        };
        
        setErrors(newErrors);
        return Object.values(newErrors).every(error => error === '');
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        // Clear specific error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
        setConflictError(null);
    };

    const handleBlur = (field) => {
        setTouched(prev => ({ ...prev, [field]: true }));
        
        // Validate on blur
        let error = '';
        switch(field) {
            case 'resourceId':
                error = validateResourceId(formData.resourceId);
                break;
            case 'purpose':
                error = validatePurpose(formData.purpose);
                break;
            case 'expectedAttendees':
                error = validateAttendees(formData.expectedAttendees);
                break;
            case 'contactEmail':
                error = validateEmail(formData.contactEmail);
                break;
            case 'contactPhone':
                error = validatePhone(formData.contactPhone);
                break;
        }
        setErrors(prev => ({ ...prev, [field]: error }));
    };

    const checkForConflict = async () => {
        if (formData.resourceId && formData.startTime && formData.endTime) {
            const timeError = validateDateTime(formData.startTime, formData.endTime);
            if (timeError) {
                setConflictError(null);
                return;
            }
            
            try {
                const result = await checkConflict(formData.resourceId, formData.startTime, formData.endTime);
                if (result.hasConflict) {
                    setConflictError('⚠️ Time slot conflict! This resource is already booked for the selected time.');
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
            setTouched({
                resourceId: true,
                purpose: true,
                expectedAttendees: true
            });
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
                    navigate('/bookings');
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
            <div className="max-w-md mx-auto mt-20 p-8 bg-green-50 rounded-lg shadow-lg text-center">
                <div className="text-6xl mb-4">✅</div>
                <h2 className="text-2xl font-bold text-green-700 mb-2">Booking Request Submitted!</h2>
                <p className="text-gray-600">Your booking request has been sent for approval.</p>
                <p className="text-gray-500 mt-4">Redirecting...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12">
            <div className="max-w-4xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-block p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl shadow-lg mb-4">
                        <span className="text-4xl">📅</span>
                    </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Request a Booking
                    </h1>
                    <p className="text-gray-500 mt-2">Fill in the details below to book a resource</p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2"></div>
                    
                    <form onSubmit={handleSubmit} className="p-8">
                        {/* Resource Section */}
                        <div className="mb-8">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
                                Resource Details
                            </h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
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
                                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 transition-all ${
                                            touched.resourceId && errors.resourceId 
                                                ? 'border-red-500 bg-red-50' 
                                                : 'border-gray-300 hover:border-blue-300'
                                        }`}
                                        placeholder="e.g., LAB-001, HALL-A"
                                    />
                                    {touched.resourceId && errors.resourceId && (
                                        <p className="text-red-500 text-xs mt-1">{errors.resourceId}</p>
                                    )}
                                    <p className="text-gray-400 text-xs mt-1">Example: LAB-001, HALL-A, MEETING-01</p>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Resource Name (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        name="resourceName"
                                        value={formData.resourceName}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                                        placeholder="e.g., Computer Lab A"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Time Section */}
                        <div className="mb-8">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
                                Time Schedule
                            </h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Start Time <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="datetime-local"
                                        name="startTime"
                                        value={formData.startTime}
                                        onChange={handleChange}
                                        onBlur={() => handleBlur('startTime')}
                                        onBlurCapture={checkForConflict}
                                        min={getMinDateTime()}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
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
                                        onBlur={() => handleBlur('endTime')}
                                        onBlurCapture={checkForConflict}
                                        min={formData.startTime || getMinDateTime()}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                                    />
                                </div>
                            </div>
                            
                            {conflictError && (
                                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700 text-sm flex items-center gap-2">
                                    <span>⚠️</span> {conflictError}
                                </div>
                            )}
                        </div>

                        {/* Purpose Section */}
                        <div className="mb-8">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
                                Booking Details
                            </h2>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Purpose <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        name="purpose"
                                        value={formData.purpose}
                                        onChange={handleChange}
                                        onBlur={() => handleBlur('purpose')}
                                        rows="3"
                                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 transition-all ${
                                            touched.purpose && errors.purpose 
                                                ? 'border-red-500 bg-red-50' 
                                                : 'border-gray-300'
                                        }`}
                                        placeholder="Describe the purpose of this booking..."
                                    />
                                    {touched.purpose && errors.purpose && (
                                        <p className="text-red-500 text-xs mt-1">{errors.purpose}</p>
                                    )}
                                    <p className="text-gray-400 text-xs mt-1 text-right">
                                        {formData.purpose.length}/500 characters
                                    </p>
                                </div>
                                
                                <div>
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
                                        className={`w-48 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 transition-all ${
                                            touched.expectedAttendees && errors.expectedAttendees 
                                                ? 'border-red-500 bg-red-50' 
                                                : 'border-gray-300'
                                        }`}
                                    />
                                    {touched.expectedAttendees && errors.expectedAttendees && (
                                        <p className="text-red-500 text-xs mt-1">{errors.expectedAttendees}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Contact Section */}
                        <div className="mb-8">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
                                Contact Information
                            </h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Email (Optional)
                                    </label>
                                    <input
                                        type="email"
                                        name="contactEmail"
                                        value={formData.contactEmail}
                                        onChange={handleChange}
                                        onBlur={() => handleBlur('contactEmail')}
                                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 transition-all ${
                                            touched.contactEmail && errors.contactEmail 
                                                ? 'border-red-500 bg-red-50' 
                                                : 'border-gray-300'
                                        }`}
                                        placeholder="your@email.com"
                                    />
                                    {touched.contactEmail && errors.contactEmail && (
                                        <p className="text-red-500 text-xs mt-1">{errors.contactEmail}</p>
                                    )}
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Phone (Optional)
                                    </label>
                                    <input
                                        type="tel"
                                        name="contactPhone"
                                        value={formData.contactPhone}
                                        onChange={handleChange}
                                        onBlur={() => handleBlur('contactPhone')}
                                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 transition-all ${
                                            touched.contactPhone && errors.contactPhone 
                                                ? 'border-red-500 bg-red-50' 
                                                : 'border-gray-300'
                                        }`}
                                        placeholder="0771234567"
                                    />
                                    {touched.contactPhone && errors.contactPhone && (
                                        <p className="text-red-500 text-xs mt-1">{errors.contactPhone}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Special Requests */}
                        <div className="mb-8">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Special Requests (Optional)
                            </label>
                            <textarea
                                name="specialRequests"
                                value={formData.specialRequests}
                                onChange={handleChange}
                                rows="2"
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="Any special requirements or requests..."
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4 pt-4">
                            <button
                                type="submit"
                                disabled={loading || conflictError}
                                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Submitting...
                                    </span>
                                ) : (
                                    'Submit Booking Request'
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/bookings')}
                                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>

                {/* Info Note */}
                <div className="mt-6 p-4 bg-blue-50 rounded-xl text-sm text-gray-600 flex items-start gap-3">
                    <span className="text-blue-500 text-xl">📌</span>
                    <div>
                        <strong>Note:</strong> Bookings will be reviewed by admin. You will receive a notification when your booking is approved or rejected.
                        <br />
                        <span className="text-xs text-gray-400">Maximum booking duration: 4 hours | Max attendees: 200</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookingForm;