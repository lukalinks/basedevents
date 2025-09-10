'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Wallet, ConnectWallet } from '@coinbase/onchainkit/wallet';
import { useRouter } from 'next/navigation';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { EventDetailsPage } from '@/app/components/events/EventDetailsPage';
import { EventRegistrationForm } from '@/app/components/events/EventRegistrationForm';
import { Event, registerForEvent, cancelRegistration, isUserRegisteredForEvent } from '@/lib/events';
import { Button } from '@/app/components/DemoComponents';

export default function ClientEventPage({ event }: { event: Event }) {
  const { address } = useAccount();
  const { setFrameReady, isFrameReady } = useMiniKit();
  const router = useRouter();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState('home');
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  // Handle scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle Farcaster Mini App initialization
  useEffect(() => {
    if (isFrameReady) {
      setFrameReady();
    }
  }, [isFrameReady, setFrameReady]);

  // Keep registration status in sync with database
  useEffect(() => {
    const check = async () => {
      try {
        if (event && address) {
          const registered = await isUserRegisteredForEvent(event.id, address);
          setIsRegistered(registered);
        } else {
          setIsRegistered(false);
        }
      } catch (e) {
        setIsRegistered(false);
      }
    };
    check();
  }, [event, address, refreshTrigger]);

  // Open registration form (always show form for consistency)
  const handleRSVP = async (eventId: string) => {
    if (!address) {
      alert('Please connect your wallet first');
      return;
    }
    if (!event) return;
    setShowRegistrationForm(true);
  };

  // Handle registration form submit using database registration flow
  const handleRegistrationSubmit = async (
    userDetails: { name: string; email: string; phone?: string; bio?: string },
    onchain?: { paymentTxHash?: `0x${string}` }
  ) => {
    if (!address) {
      alert('Please connect your wallet first');
      return;
    }
    try {
      await registerForEvent(event.id, address, userDetails, onchain);
      setShowRegistrationForm(false);
      setRefreshTrigger((prev) => prev + 1);
    } catch (error: any) {
      console.error('Registration failed:', error);
      alert(error?.message || 'Failed to register. Please try again.');
    }
  };

  const handleCancelRSVP = async (eventId: string) => {
    if (!address) return;
    try {
      await cancelRegistration(eventId, address);
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error('Cancel RSVP failed:', error);
      alert('Failed to cancel RSVP. Please try again.');
    }
  };

  const formatDate = (date: string, time: string) => {
    const eventDate = new Date(`${date}T${time}`);
    return eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const isCreator = address && event.creator === address;
  const isAttendee = address && isRegistered && !isCreator;
  const isFull = event.maxAttendees && event.attendees.length >= event.maxAttendees;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--app-background)] via-[var(--app-gray)] to-[var(--app-background)]">
      {/* Hero Section with Event Image */}
      <div className="relative h-80 sm:h-96 lg:h-[500px] overflow-hidden">
        {/* Background Image */}
        {event.imageUrl ? (
          <div className="absolute inset-0">
            <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--app-accent)] via-[var(--app-token-gate)] to-[var(--app-payment)]">
            <div className="absolute inset-0 bg-black/20"></div>
          </div>
        )}

        {/* Floating Action Button */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20">
          <button
            onClick={() => router.push('/')}
            className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 border border-white/30"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 lg:p-8 text-white">
          <div className="max-w-4xl mx-auto">
            {/* Event Status Badge */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              {event.isPaid && (
                <span className="inline-flex items-center px-2 py-1 sm:px-3 rounded-full text-xs sm:text-sm font-semibold bg-yellow-500/90 text-white backdrop-blur-sm">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="#2775CA" />
                    <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white">
                      $
                    </text>
                  </svg>
                  {event.priceUSDC ? `${event.priceUSDC} USDC` : 'Paid Event'}
                </span>
              )}
              {isFull && (
                <span className="inline-flex items-center px-2 py-1 sm:px-3 rounded-full text-xs sm:text-sm font-semibold bg-red-500/90 text-white backdrop-blur-sm">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Event Full
                </span>
              )}
              {event.tags.length > 0 && (
                <span className="inline-flex items-center px-2 py-1 sm:px-3 rounded-full text-xs sm:text-sm font-semibold bg-white/20 backdrop-blur-sm">
                  #{event.tags[0]}
                </span>
              )}
            </div>

            {/* Event Title */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold mb-3 sm:mb-4 leading-tight">{event.title}</h1>

            {/* Event Meta */}
            <div className="flex flex-col gap-2 sm:gap-3 lg:flex-row lg:items-center lg:gap-8 mb-4 sm:mb-6">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-sm sm:text-base lg:text-lg font-medium truncate">{formatDate(event.date, event.time)}</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="text-sm sm:text-base lg:text-lg font-medium truncate">{event.location}</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                </div>
                <span className="text-sm sm:text-base lg:text-lg font-medium">
                  {event.attendees.length} attending
                  {event.maxAttendees && ` / ${event.maxAttendees}`}
                </span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-col gap-2 sm:gap-3">
              {!isCreator && (
                <>
                  {!address ? (
                    <div className="w-full">
                      <Wallet>
                        <ConnectWallet />
                      </Wallet>
                    </div>
                  ) : isAttendee ? (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => handleCancelRSVP(event.id)}
                      className="w-full bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30 font-semibold px-4 py-3 sm:px-8 sm:py-4 text-base sm:text-lg"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      You're Registered ✓
                    </Button>
                  ) : isFull ? (
                    <Button
                      variant="outline"
                      size="lg"
                      disabled
                      className="w-full bg-red-500/20 backdrop-blur-sm text-white border-red-500/30 font-semibold px-4 py-3 sm:px-8 sm:py-4 text-base sm:text-lg cursor-not-allowed"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      Event Full
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => handleRSVP(event.id)}
                      className="w-full bg-white text-[var(--app-accent)] hover:bg-gray-100 font-semibold px-4 py-3 sm:px-8 sm:py-4 text-base sm:text-lg shadow-lg"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                      </svg>
                      Register Now
                    </Button>
                  )}
                </>
              )}

              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  const eventUrl = `${window.location.origin}/events/${event.id}`;
                  const shareText = `Check out this event: ${event.title} on ${formatDate(event.date, event.time)} at ${event.location}`;
                  if (navigator.share) {
                    navigator.share({ title: event.title, text: shareText, url: eventUrl });
                  } else {
                    navigator.clipboard.writeText(`${shareText}\n\n${eventUrl}`).then(() => {
                      alert('Event link copied to clipboard!');
                    });
                  }
                }}
                className="w-full bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30 font-semibold px-4 py-3 sm:px-8 sm:py-4 text-base sm:text-lg"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                  />
                </svg>
                Share Event
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Header for Navigation */}
      <header
        className={`sticky top-0 z-30 transition-all duration-300 ${
          isScrolled ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200' : 'bg-transparent'
        }`}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <button
                onClick={() => router.push('/')}
                className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                  isScrolled ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/20 text-white'
                }`}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              {isScrolled && (
                <h2 className="text-sm sm:text-lg font-semibold text-gray-900 truncate min-w-0">
                  {event.title}
                </h2>
              )}
            </div>

            {/* Wallet Connection */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {address ? (
                <div
                  className={`flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg ${
                    isScrolled ? 'bg-gray-100 text-gray-700' : 'bg-white/20 backdrop-blur-sm text-white'
                  }`}
                >
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs sm:text-sm font-medium">
                    {address.slice(0, 4)}...{address.slice(-4)}
                  </span>
                </div>
              ) : (
                <Wallet className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs">
                  <ConnectWallet />
                </Wallet>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10">
        <EventDetailsPage
          event={event}
          userAddress={address}
          onRSVPAction={handleRSVP}
          onCancelRSVPAction={handleCancelRSVP}
          refreshTrigger={refreshTrigger}
        />
      </main>

      {/* Registration Modal */}
      {showRegistrationForm && (
        <EventRegistrationForm
          event={event}
          onRegisterAction={handleRegistrationSubmit}
          onCancelAction={() => setShowRegistrationForm(false)}
        />
      )}
    </div>
  );
}
