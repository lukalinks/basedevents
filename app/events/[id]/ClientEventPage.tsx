'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect } from 'wagmi';
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { EventDetailsPage } from '@/app/components/EventComponents';
import { Event, rsvpToEvent, cancelRegistration } from '@/lib/events';
import { Button } from '@/app/components/DemoComponents';

export default function ClientEventPage({ event }: { event: Event }) {
  const { address } = useAccount();
  const { connect, connectors } = useConnect();
  const { setFrameReady, isFrameReady } = useMiniKit();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState("home");
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);

  // Handle Farcaster Mini App initialization
  useEffect(() => {
    if (isFrameReady && !address) {
      // Auto-connect if in Farcaster environment
      const connector = connectors.find(c => c.ready);
      if (connector) {
        connect({ connector });
      }
    }
  }, [isFrameReady, address, connect, connectors]);

  // Example handler (expand as needed)
  const handleRSVP = async (eventId: string) => {
    if (!address) {
      alert('Please connect your wallet first');
      return;
    }
    if (!event) return;
    if (event.isPaid || event.maxAttendees) {
      setShowRegistrationForm(true);
      return;
    }
    try {
      await rsvpToEvent(eventId, address);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('RSVP failed:', error);
      alert('Failed to RSVP. Please try again.');
    }
  };

  const handleCancelRSVP = async (eventId: string) => {
    if (!address) return;
    try {
      await cancelRegistration(eventId, address);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Cancel RSVP failed:', error);
      alert('Failed to cancel RSVP. Please try again.');
    }
  };

  // Add other handlers and UI as needed
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[var(--app-background)] to-[var(--app-gray)] font-sans text-[var(--app-foreground)]">
      {/* Header with Wallet Connection */}
      <header className="bg-[var(--app-card-bg)] border-b border-[var(--app-card-border)] p-4 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="p-2 rounded-lg hover:bg-[var(--app-gray)] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-[var(--app-foreground)]">Event Details</h1>
          </div>
          
          {/* Wallet Connection Button */}
          <div className="flex items-center gap-2">
            {address ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-[var(--app-foreground-muted)]">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
              </div>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const connector = connectors.find(c => c.ready);
                  if (connector) {
                    connect({ connector });
                  } else {
                    alert('No wallet connector available. Please install MetaMask or another wallet.');
                  }
                }}
                className="flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Connect Wallet
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <EventDetailsPage
          event={event}
          userAddress={address}
          onRSVPAction={handleRSVP}
          onCancelRSVPAction={handleCancelRSVP}
          refreshTrigger={refreshTrigger}
        />
      </main>
    </div>
  );
}
