# Enhanced Event Sharing Implementation

## Overview

This implementation provides enhanced event sharing functionality that leverages OnchainKit's `useComposeCast` hook to share events with their actual links and images across multiple platforms, with a primary focus on Farcaster integration.

## Key Features

### 🎯 Core Functionality
- **OnchainKit Integration**: Uses `useComposeCast` hook for native Farcaster sharing
- **Image Embedding**: Automatically includes event images as embeds when available
- **URL Construction**: Generates proper event URLs for sharing
- **Multi-Platform Support**: Farcaster, Twitter, LinkedIn, native sharing, and clipboard fallback
- **Responsive Design**: Compact and default variants for different UI contexts

### 📱 Platform Support
1. **Farcaster**: Native compose with image embeds using OnchainKit
2. **Native Share**: System share dialog for mobile devices
3. **Twitter**: Intent-based sharing with pre-filled text
4. **LinkedIn**: Professional network sharing
5. **Clipboard**: Fallback copy to clipboard for unsupported environments

## Implementation Details

### EventSharing Component

The main component that handles all sharing functionality:

```tsx
interface EventSharingProps {
  event: Event;
  variant?: 'default' | 'compact';
  className?: string;
}
```

#### Variants

**Compact Variant**: Minimal sharing buttons for card layouts
- Farcaster share button
- Native share button
- Ideal for event cards and lists

**Default Variant**: Full-featured sharing interface
- Multiple platform buttons
- Event preview with image
- Event URL display
- Ideal for event details pages

### Farcaster Integration

Uses OnchainKit's `useComposeCast` hook for native Farcaster sharing:

```tsx
const { composeCast } = useComposeCast();

const handleFarcasterShare = async () => {
  try {
    const eventUrl = getEventUrl();
    const shareText = `🎉 Check out this amazing event: ${event.title} on ${formatDate(event.date, event.time)} at ${event.location}`;
    
    // Include event image as embed if available
    const embeds = event.imageUrl ? [event.imageUrl] : [];
    
    await composeCast({
      text: shareText,
      embeds: embeds.length > 0 ? embeds : undefined,
    });
    
    console.log('✅ Event shared on Farcaster successfully');
  } catch (error) {
    console.error('❌ Failed to share on Farcaster:', error);
    // Fallback to URL-based sharing
    handleFallbackShare();
  }
};
```

### URL Construction

Properly constructs event URLs for sharing:

```tsx
const getEventUrl = () => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return `${baseUrl}/events/${event.id}`;
};
```

### Fallback Mechanisms

1. **Native Sharing**: Uses `navigator.share()` for mobile devices
2. **Clipboard Copy**: Falls back to clipboard for unsupported environments
3. **URL-based Farcaster**: Falls back to Warpcast compose URL if SDK fails

## Integration Points

### EnhancedEventCard
- Replaced old sharing buttons with `EventSharing` component
- Uses compact variant for card layout
- Maintains existing functionality while adding enhanced sharing

### EventDetailsModal
- Added `EventSharing` component to header
- Added full sharing interface in creator actions section
- Provides both compact and default variants

### EventDetailsPage
- Replaced multiple sharing buttons with unified `EventSharing` component
- Uses default variant for full sharing interface
- Maintains all existing sharing functionality

## Usage Examples

### Basic Usage
```tsx
import { EventSharing } from './EventSharing';

<EventSharing event={event} variant="compact" />
```

### With Custom Styling
```tsx
<EventSharing 
  event={event} 
  variant="default" 
  className="custom-styles" 
/>
```

### In Event Cards
```tsx
<div onClick={(e) => e.stopPropagation()}>
  <EventSharing event={event} variant="compact" />
</div>
```

## Event Data Structure

The component expects an `Event` object with the following structure:

```tsx
interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  imageUrl?: string;
  // ... other fields
}
```

## Sharing Text Templates

### Farcaster Share Text
```
🎉 Check out this amazing event: [Event Title] on [Date] at [Location]
```

### Twitter Share Text
```
🎉 Check out this amazing event: [Event Title] on [Date] at [Location]
```

### LinkedIn Share Text
```
Check out this amazing event: [Event Title] on [Date] at [Location]
```

## Error Handling

### Farcaster SDK Errors
- Logs error to console
- Falls back to URL-based sharing
- Provides user feedback

### Network Errors
- Graceful degradation to clipboard copy
- User-friendly error messages
- Maintains functionality across environments

## Best Practices

### Strategic Sharing Moments
- Post-event creation
- Post-registration
- After reaching milestones
- When events are trending

### Content Guidelines
- Use engaging emojis and formatting
- Keep descriptions concise but informative
- Include key event details (date, time, location)
- Leverage event images when available

### User Experience
- Provide immediate feedback on share actions
- Use appropriate button styling for each platform
- Maintain consistent behavior across variants
- Ensure accessibility with proper ARIA labels

## Testing

### Manual Testing Checklist
- [ ] Farcaster sharing works in Farcaster environment
- [ ] Fallback sharing works in browser environment
- [ ] Image embeds display correctly
- [ ] URLs are properly constructed
- [ ] Clipboard copy works on all platforms
- [ ] Error handling provides appropriate feedback

### Automated Testing
- Unit tests for URL construction
- Integration tests for sharing flows
- Error handling tests
- Cross-platform compatibility tests

## Future Enhancements

### Planned Features
- Analytics tracking for share actions
- Custom share text templates
- A/B testing for different share formats
- Integration with more social platforms
- Share scheduling functionality

### Potential Improvements
- Enhanced image optimization for embeds
- Dynamic share text based on user context
- Share performance metrics
- User preference settings for sharing

## Dependencies

### Required Packages
- `@coinbase/onchainkit`: For Farcaster integration
- `@farcaster/miniapp-sdk`: For Farcaster SDK functionality

### Internal Dependencies
- `@/lib/events`: Event type definitions
- `../DemoComponents`: UI components (Button, Icon)

## Conclusion

This enhanced event sharing implementation provides a comprehensive solution for sharing events across multiple platforms while maintaining a focus on Farcaster integration through OnchainKit. The modular design allows for easy integration into existing components while providing rich functionality for users to share their events effectively.