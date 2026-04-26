import React, { useEffect, useState } from 'react';
import { CalendarFold, ClipboardList } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import TicketParticlesBackground from '../../components/TicketParticlesBackground';
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

    const tabButtonClass = (tab) =>
        `inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
            activeTab === tab
                ? 'border-cyan-200 bg-cyan-50 text-cyan-700 shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800'
        }`;

    return (
        <div className="w-full px-2 py-2 sm:px-4 sm:py-4 lg:px-6">
            {isAdminView ? (
                <>
                    <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => setActiveTab('all')} className={tabButtonClass('all')}>
                                <ClipboardList className="h-4 w-4" />
                                All Bookings
                            </button>
                        </div>
                    </section>

                    <div>{activeTab === 'all' && <BookingsList />}</div>
                </>
            ) : (
                <section className="relative min-h-[calc(100vh-4rem)] w-full overflow-hidden rounded-none border-0 bg-gradient-to-br from-cyan-50 via-white to-sky-50 p-0">
                    <TicketParticlesBackground />

                    <div className="relative z-10 w-full px-2 py-2 sm:px-4 sm:py-4 lg:px-6">
                        <div className="w-full">
                            {activeTab === 'new' && canOpenUserBookingForm && (
                                <BookingForm
                                    initialResourceId={prefilledResourceId}
                                    initialLocation={prefilledLocation}
                                    initialReturnTo={returnTo}
                                />
                            )}
                            {activeTab === 'my' && <MyBookings />}
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
};

export default BookingsPage;