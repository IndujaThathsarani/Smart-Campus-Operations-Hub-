import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import BookingsList from './BookingsList';
import BookingForm from './BookingForm';
import MyBookings from './MyBookings';

const BookingsPage = () => {
    const { roles } = useAuth();
    const [searchParams] = useSearchParams();
    const requestedTab = searchParams.get('tab');
    const prefilledResourceId = searchParams.get('resourceId') || '';
    const prefilledLocation = searchParams.get('location') || '';
    const returnTo = searchParams.get('returnTo') || '';
    const isAdminView = roles.includes('ROLE_ADMIN') || roles.includes('ROLE_SYSTEM_ADMIN');
    const canOpenUserBookingForm = Boolean(prefilledResourceId);
    const [activeTab, setActiveTab] = useState(isAdminView ? 'all' : 'my');
    const showTabNavigation = isAdminView || activeTab !== 'new';

    useEffect(() => {
        if (isAdminView) {
            setActiveTab('all');
            return;
        }

        if (requestedTab === 'new' || requestedTab === 'my') {
            if (requestedTab === 'new' && !canOpenUserBookingForm) {
                setActiveTab('my');
                return;
            }
            setActiveTab(requestedTab);
            return;
        }

        if (requestedTab === 'all') {
            setActiveTab('my');
            return;
        }

        if (!requestedTab) {
            setActiveTab('my');
        }
    }, [requestedTab, isAdminView, canOpenUserBookingForm]);

    return (
        <div className="mx-auto w-full px-2 py-6 sm:px-4 lg:px-6">
            {/* Tab Navigation */}
            {showTabNavigation && (
                <div className="flex border-b mb-6">
                    {isAdminView && (
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
                    )}
                    {!isAdminView && (
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
                    )}
                </div>
            )}

            {/* Render Active Tab */}
            <div>
                {isAdminView && activeTab === 'all' && <BookingsList />}
                {!isAdminView && activeTab === 'new' && canOpenUserBookingForm && (
                    <BookingForm
                        initialResourceId={prefilledResourceId}
                        initialLocation={prefilledLocation}
                        initialReturnTo={returnTo}
                    />
                )}
                {!isAdminView && activeTab === 'my' && <MyBookings />}
            </div>
        </div>
    );
};

export default BookingsPage;