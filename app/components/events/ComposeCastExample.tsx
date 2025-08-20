"use client";

import ComposeCastButton from './ComposeCastButton';
import { Event } from '@/lib/events';

// Example event data for demonstration
const exampleEvent: Event = {
  id: 'example-event-123',
  title: 'Web3 Developer Meetup',
  description: 'Join us for an exciting evening of networking and learning about the latest in Web3 development. Meet fellow developers, share ideas, and discover new opportunities in the blockchain space.',
  date: '2024-02-15',
  time: '18:00',
  location: 'San Francisco, CA',
  creator: '0x1234567890abcdef',
  attendees: ['0xabcdef1234567890', '0xfedcba0987654321'],
  maxAttendees: 50,
  tags: ['web3', 'development', 'networking'],
  isRecurring: false,
  status: 'upcoming',
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  imageUrl: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=400&h=300&fit=crop',
  isPaid: true,
  priceUSDC: 25,
  isTokenGated: true,
  requiredTokenAddress: '0x1234567890abcdef',
  requiredTokenBalance: 1,
  requiredTokenSymbol: 'DEV',
  requiredTokenName: 'Developer Token',
  tokenGateType: 'ERC20'
};

export default function ComposeCastExample() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-[var(--app-foreground)]">
          Farcaster Event Sharing Examples
        </h1>
        <p className="text-[var(--app-foreground-muted)]">
          Examples of how to grab event links when users share events within Farcaster
        </p>
      </div>

      {/* Example Event Card */}
      <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <div className="flex items-start gap-4">
          {exampleEvent.imageUrl && (
            <img 
              src={exampleEvent.imageUrl} 
              alt={exampleEvent.title} 
              className="w-20 h-20 object-cover rounded-lg"
            />
          )}
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-[var(--app-foreground)]">
              {exampleEvent.title}
            </h2>
            <p className="text-[var(--app-foreground-muted)] text-sm">
              📅 {new Date(`${exampleEvent.date}T${exampleEvent.time}`).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })} • 📍 {exampleEvent.location}
            </p>
            <p className="text-[var(--app-foreground-muted)] text-sm mt-2">
              {exampleEvent.description}
            </p>
            <div className="flex gap-2 mt-2">
              {exampleEvent.isPaid && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  💰 {exampleEvent.priceUSDC} USDC
                </span>
              )}
              {exampleEvent.isTokenGated && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                  🔒 Token-gated
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sharing Examples */}
      <div className="space-y-6">
        {/* Achievement Share Example */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-[var(--app-foreground)] mb-3">
            Share Achievement
          </h3>
          <p className="text-[var(--app-foreground-muted)] text-sm mb-4">
            Share your event participation as an achievement on Farcaster
          </p>
          <ComposeCastButton 
            event={exampleEvent} 
            variant="achievement"
            className="w-full"
          />
        </div>

        {/* Frame Share Example */}
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-[var(--app-foreground)] mb-3">
            Share Frame
          </h3>
          <p className="text-[var(--app-foreground-muted)] text-sm mb-4">
            Share the event as a Frame with embedded content and links
          </p>
          <ComposeCastButton 
            event={exampleEvent} 
            variant="frame"
            className="w-full"
          />
        </div>

        {/* Compact Share Example */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-[var(--app-foreground)] mb-3">
            Compact Sharing
          </h3>
          <p className="text-[var(--app-foreground-muted)] text-sm mb-4">
            Compact buttons for both achievement and frame sharing
          </p>
          <ComposeCastButton 
            event={exampleEvent} 
            variant="compact"
          />
        </div>

        {/* Default Share Example */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-[var(--app-foreground)] mb-3">
            Full Sharing Interface
          </h3>
          <p className="text-[var(--app-foreground-muted)] text-sm mb-4">
            Complete sharing interface with event preview and both sharing options
          </p>
          <ComposeCastButton 
            event={exampleEvent} 
            variant="default"
          />
        </div>
      </div>

      {/* How it works */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-800 mb-3">
          How Event Link Grabbing Works
        </h3>
        <div className="space-y-2 text-sm text-yellow-700">
          <p>• <strong>Event URL Generation:</strong> Automatically generates unique URLs for each event</p>
          <p>• <strong>Rich Metadata:</strong> Includes event details, pricing, and token gating info</p>
          <p>• <strong>Embed Support:</strong> Embeds event images and URLs for better previews</p>
          <p>• <strong>Analytics Tracking:</strong> Stores sharing data for engagement metrics</p>
          <p>• <strong>Fallback Handling:</strong> Graceful fallbacks when Farcaster sharing fails</p>
        </div>
      </div>
    </div>
  );
}