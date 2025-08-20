"use client";

import { useState } from 'react';
import { EventSharing } from './EventSharing';
import { Event } from '@/lib/events';

// Example component demonstrating enhanced event sharing
export function EventSharingExample() {
  const [selectedVariant, setSelectedVariant] = useState<'default' | 'compact'>('default');

  // Example event data
  const exampleEvent: Event = {
    id: 'example-event-123',
    title: 'Web3 Developer Meetup',
    description: 'Join us for an exciting evening of networking, learning, and collaboration with fellow Web3 developers. We\'ll discuss the latest trends in blockchain development, share project updates, and explore new opportunities in the decentralized ecosystem.',
    date: '2024-02-15',
    time: '18:00',
    location: 'Tech Hub Downtown, San Francisco',
    creator: '0x1234567890abcdef',
    attendees: ['0x1234567890abcdef', '0xabcdef1234567890'],
    maxAttendees: 50,
    tags: ['Web3', 'Blockchain', 'Networking', 'Development'],
    isRecurring: false,
    status: 'upcoming',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    imageUrl: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&h=600&fit=crop',
    isPaid: false,
    isTokenGated: false,
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-[var(--app-foreground)] mb-4">
          Enhanced Event Sharing with OnchainKit
        </h1>
        <p className="text-[var(--app-foreground-muted)] mb-6">
          This example demonstrates the enhanced event sharing functionality that uses OnchainKit's 
          <code className="bg-[var(--app-gray)] px-2 py-1 rounded text-sm">useComposeCast</code> hook 
          to share events with their actual links and images.
        </p>
      </div>

      {/* Variant Selector */}
      <div className="bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-xl p-6">
        <h2 className="text-xl font-semibold text-[var(--app-foreground)] mb-4">Sharing Variants</h2>
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setSelectedVariant('default')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedVariant === 'default'
                ? 'bg-[var(--app-accent)] text-white'
                : 'bg-[var(--app-gray)] text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)]'
            }`}
          >
            Default Variant
          </button>
          <button
            onClick={() => setSelectedVariant('compact')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedVariant === 'compact'
                ? 'bg-[var(--app-accent)] text-white'
                : 'bg-[var(--app-gray)] text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)]'
            }`}
          >
            Compact Variant
          </button>
        </div>

        {/* Event Preview */}
        <div className="bg-[var(--app-gray)] rounded-lg p-4 mb-6">
          <h3 className="font-medium text-[var(--app-foreground)] mb-2">Example Event</h3>
          <div className="flex items-start gap-4">
            {exampleEvent.imageUrl && (
              <img 
                src={exampleEvent.imageUrl} 
                alt={exampleEvent.title} 
                className="w-20 h-20 object-cover rounded-lg"
              />
            )}
            <div className="flex-1">
              <h4 className="font-semibold text-[var(--app-foreground)]">{exampleEvent.title}</h4>
              <p className="text-sm text-[var(--app-foreground-muted)]">
                {new Date(`${exampleEvent.date}T${exampleEvent.time}`).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })} • {exampleEvent.location}
              </p>
              <p className="text-sm text-[var(--app-foreground-muted)] mt-1">
                {exampleEvent.description.substring(0, 100)}...
              </p>
            </div>
          </div>
        </div>

        {/* Sharing Component */}
        <div className="border border-[var(--app-card-border)] rounded-lg p-6">
          <h3 className="font-medium text-[var(--app-foreground)] mb-4">
            EventSharing Component ({selectedVariant} variant)
          </h3>
          <EventSharing event={exampleEvent} variant={selectedVariant} />
        </div>
      </div>

      {/* Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-[var(--app-foreground)] mb-3">Key Features</h3>
          <ul className="space-y-2 text-sm text-[var(--app-foreground-muted)]">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Uses OnchainKit's <code className="bg-[var(--app-gray)] px-1 rounded">useComposeCast</code> hook
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Automatically includes event images as embeds
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Constructs proper event URLs for sharing
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Fallback to native sharing and clipboard
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Multiple social platform support
            </li>
          </ul>
        </div>

        <div className="bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-[var(--app-foreground)] mb-3">Sharing Platforms</h3>
          <ul className="space-y-2 text-sm text-[var(--app-foreground-muted)]">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              <strong>Farcaster:</strong> Native compose with image embeds
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <strong>Native Share:</strong> System share dialog
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-sky-500 rounded-full"></span>
              <strong>Twitter:</strong> Intent-based sharing
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
              <strong>LinkedIn:</strong> Professional network sharing
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
              <strong>Clipboard:</strong> Fallback copy to clipboard
            </li>
          </ul>
        </div>
      </div>

      {/* Code Example */}
      <div className="bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-[var(--app-foreground)] mb-3">Usage Example</h3>
        <pre className="bg-[var(--app-gray)] rounded-lg p-4 text-sm overflow-x-auto">
{`import { EventSharing } from './EventSharing';

// In your component
<EventSharing 
  event={event} 
  variant="default" // or "compact"
  className="custom-styles"
/>`}
        </pre>
      </div>
    </div>
  );
}