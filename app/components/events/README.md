# Event Components

This directory contains all the event-related components for the application.

## Components

### Core Event Components
- `EventForm.tsx` - Form for creating and editing events
- `EventList.tsx` - List view of events
- `EventDetailsModal.tsx` - Modal for viewing event details
- `EventRegistrationForm.tsx` - Form for registering to events
- `EventAttendeesList.tsx` - List of event attendees
- `UserNFTTicketsCollection.tsx` - User's NFT ticket collection
- `MyEventsPage.tsx` - Page for managing user's events
- `EnhancedEventCard.tsx` - Enhanced event card component

### Sharing Components
- `EventSharing.tsx` - General event sharing component with multiple platforms
- `ComposeCastButton.tsx` - **NEW** Farcaster-specific event sharing with link grabbing
- `ComposeCastExample.tsx` - **NEW** Example usage of Farcaster event sharing

## Farcaster Event Sharing

The new `ComposeCastButton` component provides specialized functionality for sharing events on Farcaster while automatically grabbing event links.

### Features

- **Automatic Link Generation**: Creates unique URLs for each event
- **Rich Metadata**: Includes event details, pricing, and token gating info
- **Embed Support**: Embeds event images and URLs for better previews
- **Analytics Tracking**: Stores sharing data for engagement metrics
- **Multiple Variants**: Achievement sharing, Frame sharing, and compact modes

### Usage

```tsx
import { ComposeCastButton } from '@/app/components/events';

// Basic usage
<ComposeCastButton event={eventData} />

// Achievement sharing
<ComposeCastButton event={eventData} variant="achievement" />

// Frame sharing with embeds
<ComposeCastButton event={eventData} variant="frame" />

// Compact mode
<ComposeCastButton event={eventData} variant="compact" />
```

### Event Link Grabbing

When users share events within Farcaster, the component automatically:

1. **Generates Event URLs**: Creates unique, shareable links for each event
2. **Includes Rich Metadata**: Adds event details, pricing, and token gating information
3. **Embeds Content**: Includes event images and URLs for better link previews
4. **Tracks Analytics**: Stores sharing data for engagement metrics
5. **Handles Fallbacks**: Provides graceful fallbacks when Farcaster sharing fails

### Example Integration

```tsx
import { ComposeCastButton } from '@/app/components/events';

function EventCard({ event }) {
  return (
    <div className="event-card">
      <h3>{event.title}</h3>
      <p>{event.description}</p>
      
      {/* Farcaster sharing with automatic link grabbing */}
      <ComposeCastButton 
        event={event} 
        variant="achievement"
        className="mt-4"
      />
    </div>
  );
}
```

### Analytics

The component automatically tracks sharing analytics:

```javascript
// Stored in localStorage
const sharedEvents = JSON.parse(localStorage.getItem('farcasterSharedEvents') || '[]');

// Example analytics data
{
  eventId: 'event-123',
  eventTitle: 'Web3 Developer Meetup',
  shareType: 'achievement',
  timestamp: '2024-01-15T10:00:00Z',
  eventUrl: 'https://yourapp.com/events/event-123',
  platform: 'farcaster'
}
```

### Configuration

You can customize the sharing behavior by modifying the `ComposeCastButton` component:

- **Share Text**: Customize the text content for different sharing types
- **Embeds**: Configure which content gets embedded in Farcaster posts
- **Analytics**: Add custom analytics endpoints or modify tracking behavior
- **Styling**: Customize the appearance using Tailwind classes

## Contributing

When adding new event components:

1. Follow the existing naming conventions
2. Include TypeScript types for all props
3. Add proper error handling
4. Include loading states where appropriate
5. Update this README with new component documentation
