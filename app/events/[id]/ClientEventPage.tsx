'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import {
  Name,
  Identity,
  Address,
  Avatar,
  EthBalance,
} from "@coinbase/onchainkit/identity";
import { EventDetailsPage } from '@/app/components/EventComponents';
import { Event, rsvpToEvent, cancelRegistration } from '@/lib/events';

export default function ClientEventPage({ event }: { event: Event }) {
  const { address } = useAccount();
  const { setFrameReady, isFrameReady } = useMiniKit();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState("home");
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);

  // Handle Farcaster Mini App initialization
  useEffect(() => {
    if (isFrameReady) {
      setFrameReady(true);
    }
  }, [isFrameReady, setFrameReady]);

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

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[var(--app-background)] to-[var(--app-gray)] font-sans text-[var(--app-foreground)]">
      {/* Header with Wallet Connection */}
      <header className="bg-[var(--app-card-bg)] border-b border-[var(--app-card-border)] p-4 sticky top-0 z-10 shadow-sm">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="p-2 rounded-lg hover:bg-[var(--app-gray)] transition-colors"
              aria-label="Go back"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Logo" className="h-6 w-6 rounded" />
              <h1 className="text-lg font-semibold text-[var(--app-foreground)]">Event Details</h1>
            </div>
          </div>
          
          {/* OnChainKit Wallet Connection */}
          <Wallet className="z-10">
            <ConnectWallet>
              <Name className="text-inherit" />
            </ConnectWallet>
            <WalletDropdown>
              <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                <Avatar />
                <Name />
                <Address />
                <EthBalance />
              </Identity>
              <WalletDropdownDisconnect />
            </WalletDropdown>
          </Wallet>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20 max-w-md mx-auto w-full px-4">
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
