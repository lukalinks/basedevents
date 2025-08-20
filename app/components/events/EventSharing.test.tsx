"use client";

import { EventSharing } from './EventSharing';
import { Event } from '@/lib/events';

// Simple test component to verify EventSharing works
export function EventSharingTest() {
  const testEvent: Event = {
    id: 'test-event-123',
    title: 'Test Event',
    description: 'This is a test event for verifying the EventSharing component works correctly.',
    date: '2024-02-15',
    time: '18:00',
    location: 'Test Location',
    creator: '0x1234567890abcdef',
    attendees: [],
    tags: ['test'],
    isRecurring: false,
    status: 'upcoming',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    imageUrl: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=400&h=300&fit=crop',
    isPaid: false,
    isTokenGated: false,
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[var(--app-foreground)]">
        EventSharing Component Test
      </h1>
      
      <div className="bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[var(--app-foreground)] mb-4">
          Compact Variant
        </h2>
        <EventSharing event={testEvent} variant="compact" />
      </div>

      <div className="bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[var(--app-foreground)] mb-4">
          Default Variant
        </h2>
        <EventSharing event={testEvent} variant="default" />
      </div>

      <div className="bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[var(--app-foreground)] mb-4">
          Event Without Image
        </h2>
        <EventSharing 
          event={{ ...testEvent, imageUrl: undefined }} 
          variant="default" 
        />
      </div>
    </div>
  );
}