import React, { useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, Clock3, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createBooking, checkConflict } from '../../services/bookingService';

const BUSINESS_START_HOUR = 8;
const BUSINESS_END_HOUR = 17;
const SLOT_INTERVAL_MINUTES = 30;

const toLocalDateInputValue = (date) => {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 10);
};

const toTimeMinutes = (timeValue) => {
    if (!timeValue) return null;
    const [hourText, minuteText] = String(timeValue).split(':');
    const hours = Number(hourText);
    const minutes = Number(minuteText);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return hours * 60 + minutes;
};

const minutesToTimeValue = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

const formatTimeLabel = (timeValue) => {
    const total = toTimeMinutes(timeValue);
    if (total === null) return timeValue;
    const hours24 = Math.floor(total / 60);
    const minutes = total % 60;
    const period = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
};

const roundUpToIntervalMinutes = (date, intervalMinutes) => {
    const total = date.getHours() * 60 + date.getMinutes();
    return Math.ceil(total / intervalMinutes) * intervalMinutes;
};

const buildDateTimeLocal = (dateValue, timeValue) => {
    if (!dateValue || !timeValue) return '';
    return `${dateValue}T${timeValue}`;
};

const BUSINESS_TIME_OPTIONS = (() => {
    const options = [];
    for (let minutes = BUSINESS_START_HOUR * 60; minutes <= BUSINESS_END_HOUR * 60; minutes += SLOT_INTERVAL_MINUTES) {
        const value = minutesToTimeValue(minutes);
        options.push({ value, label: formatTimeLabel(value) });
    }
    return options;
})();

const parseDateTimeLocal = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isWithinBusinessHours = (date) => {
    if (!date) return false;
    const minutes = date.getHours() * 60 + date.getMinutes();
    const startMinutes = BUSINESS_START_HOUR * 60;
    const endMinutes = BUSINESS_END_HOUR * 60;
    return minutes >= startMinutes && minutes <= endMinutes;
};

const getBusinessHoursValidationMessage = (startTime, endTime) => {
    const startDate = parseDateTimeLocal(startTime);
    const endDate = parseDateTimeLocal(endTime);

    if (!startDate || !endDate) return null;

    if (!isWithinBusinessHours(startDate) || !isWithinBusinessHours(endDate)) {
        return 'Start and end times must be between 8:00 AM and 5:00 PM.';
    }

    if (endDate <= startDate) {
        return 'End time must be later than start time.';
    }

    return null;
};

const BookingForm = ({ initialResourceId = '', initialLocation = '', initialCapacity = '', initialReturnTo = '' }) => {
    const navigate = useNavigate();
    const isResourceLocked = Boolean(initialResourceId);
    const isLocationLocked = Boolean(initialLocation);
    const parsedCapacity = Number(initialCapacity);
    const capacityLimit = Number.isFinite(parsedCapacity) && parsedCapacity > 0 ? Math.floor(parsedCapacity) : null;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [conflictError, setConflictError] = useState(null);
    const [attendeeError, setAttendeeError] = useState(null);
    const [timeRangeError, setTimeRangeError] = useState(null);
    const [bookingCreated, setBookingCreated] = useState(false);
    const [bookingResult, setBookingResult] = useState(null);
    const [bookingDate, setBookingDate] = useState('');
    const [startClock, setStartClock] = useState('');
    const [endClock, setEndClock] = useState('');
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

    useEffect(() => {
        if (formData.startTime) {
            setBookingDate(formData.startTime.slice(0, 10));
            setStartClock(formData.startTime.slice(11, 16));
        }
        if (formData.endTime) {
            setEndClock(formData.endTime.slice(11, 16));
        }
    }, []);

    const updateSchedule = (nextDate, nextStart, nextEnd) => {
        let adjustedEnd = nextEnd;
        const startMinutes = toTimeMinutes(nextStart);
        const endMinutes = toTimeMinutes(nextEnd);

        if (startMinutes !== null && endMinutes !== null && endMinutes <= startMinutes) {
            adjustedEnd = '';
        }

        const nextStartTime = buildDateTimeLocal(nextDate, nextStart);
        const nextEndTime = buildDateTimeLocal(nextDate, adjustedEnd);

        setBookingDate(nextDate);
        setStartClock(nextStart);
        setEndClock(adjustedEnd);

        setFormData((prev) => ({
            ...prev,
            startTime: nextStartTime,
            endTime: nextEndTime,
        }));

        const timeMessage = getBusinessHoursValidationMessage(nextStartTime, nextEndTime);
        setTimeRangeError(timeMessage);
        setConflictError(null);
        setError(null);
    };

    const todayDateValue = toLocalDateInputValue(new Date());
    const minimumDateValue = todayDateValue;
    const minimumStartMinutesForDate = bookingDate === todayDateValue
        ? roundUpToIntervalMinutes(new Date(), SLOT_INTERVAL_MINUTES)
        : BUSINESS_START_HOUR * 60;

    const startTimeOptions = BUSINESS_TIME_OPTIONS.filter((option) => {
        const minutes = toTimeMinutes(option.value);
        return minutes !== null && minutes >= minimumStartMinutesForDate;
    });

    const selectedStartMinutes = toTimeMinutes(startClock);
    const endTimeOptions = BUSINESS_TIME_OPTIONS.filter((option) => {
        const minutes = toTimeMinutes(option.value);
        if (minutes === null) return false;
        if (minutes < minimumStartMinutesForDate) return false;
        if (selectedStartMinutes !== null && minutes <= selectedStartMinutes) return false;
        return true;
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        if ((name === 'resourceId' && isResourceLocked) || (name === 'location' && isLocationLocked)) {
            return;
        }

        let finalValue = value;
        
        // Convert expectedAttendees to number
        if (name === 'expectedAttendees' && value !== '') {
            finalValue = parseInt(value, 10) || 1;
        }

        if (name === 'expectedAttendees') {
            const attendeesCount = Number(finalValue) || 1;
            if (capacityLimit && attendeesCount > capacityLimit) {
                setAttendeeError(`Expected attendees cannot exceed this resource capacity (${capacityLimit}).`);
            } else {
                setAttendeeError(null);
            }
        }

        setFormData((prev) => ({ ...prev, [name]: finalValue }));
        setConflictError(null);
        setError(null);
    };

    const checkForConflict = async () => {
        if (formData.resourceId && formData.startTime && formData.endTime) {
            const timeMessage = getBusinessHoursValidationMessage(formData.startTime, formData.endTime);
            if (timeMessage) {
                setTimeRangeError(timeMessage);
                setConflictError(null);
                return;
            }

            setTimeRangeError(null);
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

        const attendeesCount = Number(formData.expectedAttendees) || 1;
        if (capacityLimit && attendeesCount > capacityLimit) {
            setAttendeeError(`Expected attendees cannot exceed this resource capacity (${capacityLimit}).`);
            return;
        }

        const timeMessage = getBusinessHoursValidationMessage(formData.startTime, formData.endTime);
        if (timeMessage) {
            setTimeRangeError(timeMessage);
            return;
        }

        setTimeRangeError(null);

        submitBooking(false);
    };

    const handleJoinWaitlist = () => {
        submitBooking(true);
    };

    const handleBookingDateChange = (value) => {
        const minMinutes = value === todayDateValue
            ? roundUpToIntervalMinutes(new Date(), SLOT_INTERVAL_MINUTES)
            : BUSINESS_START_HOUR * 60;

        let nextStart = startClock;
        let nextEnd = endClock;

        const startMinutes = toTimeMinutes(nextStart);
        if (startMinutes !== null && startMinutes < minMinutes) {
            nextStart = '';
            nextEnd = '';
        }

        const endMinutes = toTimeMinutes(nextEnd);
        if (endMinutes !== null && endMinutes < minMinutes) {
            nextEnd = '';
        }

        updateSchedule(value, nextStart, nextEnd);
    };

    if (bookingCreated) {
        const isWaitlisted = bookingResult?.status === 'WAITLISTED';
        return (
            <div className="flex min-h-[70vh] items-center justify-center bg-transparent p-6">
                <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center sm:p-10">
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
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-700 px-8 py-3 text-base font-semibold text-white hover:bg-cyan-800"
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

                {timeRangeError && (
                    <div className="mb-4 inline-flex w-full items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        {timeRangeError}
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
                            readOnly={isResourceLocked}
                            aria-readonly={isResourceLocked}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                            placeholder="e.g., RES-001"
                            title={isResourceLocked ? 'This resource was selected from the resource page' : 'Enter the resource ID you want to book.'}
                        />
                        <p className="mt-1 text-xs text-slate-500">
                            {isResourceLocked ? 'Selected from the resource page and locked for this booking.' : 'Enter the resource ID you want to book.'}
                        </p>
                    </div>

                    <div className="mb-4">
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Location</label>
                        <input
                            type="text"
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            readOnly={isLocationLocked}
                            aria-readonly={isLocationLocked}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                            placeholder="Location will auto-fill from selected resource"
                            title={isLocationLocked ? 'This location was selected from the resource page' : 'Location will auto-fill from selected resource'}
                        />
                        <p className="mt-1 text-xs text-slate-500">
                            {isLocationLocked ? 'Selected from the resource page and locked for this booking.' : 'Location will auto-fill from selected resource.'}
                        </p>
                    </div>

                    <div className="mb-4">
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Booking Date *</label>
                        <input
                            type="date"
                            name="bookingDate"
                            value={bookingDate}
                            onChange={(e) => handleBookingDateChange(e.target.value)}
                            onBlur={checkForConflict}
                            min={minimumDateValue}
                            required
                            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                        />
                    </div>

                    <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">Start Time *</label>
                            <select
                                name="startClock"
                                value={startClock}
                                onChange={(e) => updateSchedule(bookingDate, e.target.value, endClock)}
                                onBlur={checkForConflict}
                                required
                                disabled={!bookingDate || startTimeOptions.length === 0}
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                            >
                                <option value="">Select start time</option>
                                {startTimeOptions.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">End Time *</label>
                            <select
                                name="endClock"
                                value={endClock}
                                onChange={(e) => updateSchedule(bookingDate, startClock, e.target.value)}
                                onBlur={checkForConflict}
                                required
                                disabled={!bookingDate || !startClock || endTimeOptions.length === 0}
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                            >
                                <option value="">Select end time</option>
                                {endTimeOptions.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <p className="mb-4 text-xs text-slate-500">
                        Booking time window: 8:00 AM to 5:00 PM. Choose a date first, then pick start and end time.
                    </p>
                    {bookingDate === todayDateValue && startTimeOptions.length === 0 && (
                        <p className="mb-4 text-xs font-medium text-amber-700">No remaining time slots today. Please choose another date.</p>
                    )}

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
                            max={capacityLimit || 500}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                        />
                        {capacityLimit && (
                            <p className="mt-1 text-xs text-slate-500">Resource capacity limit: {capacityLimit} attendees.</p>
                        )}
                        {attendeeError && (
                            <p className="mt-1 text-xs font-medium text-rose-700">{attendeeError}</p>
                        )}
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