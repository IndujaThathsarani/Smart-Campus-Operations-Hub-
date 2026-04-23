import React, { useState } from 'react';
import BookingsList from './BookingsList';
import BookingForm from './BookingForm';
import MyBookings from './MyBookings';

const BookingsPage = () => {
    const [activeTab, setActiveTab] = useState('all');

    return (
        <div className="mx-auto w-full px-2 py-6 sm:px-4 lg:px-6">
            {/* Tab Navigation */}
            <div className="flex border-b mb-6">
                <button
                    onClick={() => setActiveTab('all')}
                    className={`px-6 py-3 font-medium transition-colors ${
                        activeTab === 'all'
                            ? 'border-b-2 border-blue-500 text-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    📋 All Bookings
                </button>
                <button
                    onClick={() => setActiveTab('new')}
                    className={`px-6 py-3 font-medium transition-colors ${
                        activeTab === 'new'
                            ? 'border-b-2 border-blue-500 text-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    ✨ New Booking
                </button>
                <button
                    onClick={() => setActiveTab('my')}
                    className={`px-6 py-3 font-medium transition-colors ${
                        activeTab === 'my'
                            ? 'border-b-2 border-blue-500 text-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    📖 My Bookings
                </button>
            </div>

            {/* Render Active Tab */}
            <div>
                {activeTab === 'all' && <BookingsList />}
                {activeTab === 'new' && <BookingForm />}
                {activeTab === 'my' && <MyBookings />}
            </div>
        </div>
    );
};

export default BookingsPage;