'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { EventDetailsPage } from '@/app/components/EventComponents';
import { Event, rsvpToEvent, cancelRegistration } from '@/lib/events';

export default function ClientEventPage({ event }: { event: Event }) {
  const { address } = useAccount();
  const { setFrameReady, isFrameReady } = useMiniKit();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState("home");
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);

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

  // Add other handlers and UI as needed
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[var(--app-background)] to-[var(--app-gray)] font-sans text-[var(--app-foreground)]">
      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <EventDetailsPage
          event={event}
          userAddress={address}
          onRSVPAction={handleRSVP}
          // Add other props and handlers as needed
        />
      </main>
    </div>
  );
}
