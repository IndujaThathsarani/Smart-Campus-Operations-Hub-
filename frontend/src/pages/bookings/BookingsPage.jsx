import React, { useState } from 'react';
import BookingsList from './BookingsList';
import BookingForm from './BookingForm';
import MyBookings from './MyBookings';

const BookingsPage = () => {
    const [activeTab, setActiveTab] = useState('all');

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header Banner */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">📋 Booking Management</h1>
                            <p className="text-gray-500 text-sm mt-1">Manage resource bookings, track requests, and view schedules</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-sm font-medium text-gray-700">Admin</p>
                                <p className="text-xs text-gray-400">Administrator</p>
                            </div>
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                                A
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="max-w-7xl mx-auto px-6 mt-6">
                <div className="flex gap-1 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-t-lg transition-all ${
                            activeTab === 'all'
                                ? 'bg-white text-blue-600 border-b-2 border-blue-500 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                        <span className="text-lg">📊</span>
                        All Bookings
                        {activeTab === 'all' && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full">Active</span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('new')}
                        className={`flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-t-lg transition-all ${
                            activeTab === 'new'
                                ? 'bg-white text-blue-600 border-b-2 border-blue-500 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                        <span className="text-lg">✨</span>
                        New Booking
                        {activeTab === 'new' && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-600 rounded-full">Form</span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('my')}
                        className={`flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-t-lg transition-all ${
                            activeTab === 'my'
                                ? 'bg-white text-blue-600 border-b-2 border-blue-500 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                        <span className="text-lg">👤</span>
                        My Bookings
                        {activeTab === 'my' && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-600 rounded-full">Personal</span>
                        )}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-7xl mx-auto px-6 py-6">
                {activeTab === 'all' && <BookingsList />}
                {activeTab === 'new' && <BookingForm />}
                {activeTab === 'my' && <MyBookings />}
            </div>
        </div>
    );
};

export default BookingsPage;