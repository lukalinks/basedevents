# 🏠 Home Screen Implementation Guide for EventFI

## Overview

The home screen is the main landing page of the EventFI Farcaster Mini App, designed to provide users with a comprehensive view of events, search capabilities, and quick access to key features. This guide explains how the home screen is structured and implemented.

## 📱 App Structure

### Main Entry Point: `app/page.tsx`

The home screen is implemented in the main page component that serves as the app's entry point. It uses a tab-based navigation system with the following structure:

```typescript
export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  // ... other state management
  
  return (
    <div className="min-h-screen bg-[var(--app-background)]">
      {/* Header */}
      {/* Tab Navigation */}
      {/* Tab Content */}
    </div>
  );
}
```

## 🎨 Key Components

### 1. Header Component
**Location**: `app/page.tsx` (lines 100-150)

```typescript
<div className="bg-[var(--app-card-bg)] border-b border-[var(--app-card-border)] p-4">
  <div className="flex justify-between items-center">
    <h1 className="text-xl font-bold text-[var(--app-foreground)]">
      EventFI
    </h1>
    {/* Farcaster integration buttons */}
  </div>
</div>
```

**Features**:
- App branding ("EventFI")
- Farcaster Mini App integration
- Add to Farcaster button
- Responsive design

### 2. Tab Navigation
**Location**: `app/page.tsx` (lines 150-200)

```typescript
<div className="flex border-b border-[var(--app-card-border)] bg-[var(--app-card-bg)]">
  {tabs.map(tab => (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
        activeTab === tab.id 
          ? "text-[var(--app-accent)] border-b-2 border-[var(--app-accent)]" 
          : "text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)]"
      }`}
    >
      {tab.label}
    </button>
  ))}
</div>
```

**Available Tabs**:
- **Home** - Main events feed
- **My Events** - User's created events
- **Create** - Event creation form
- **Hosts** - Popular event hosts
- **Profile** - User profile management

### 3. Home Tab Content
**Location**: `app/page.tsx` (lines 200-300)

The home tab displays the main events feed with search and filtering capabilities.

## 🔍 Search & Filtering System

### Enhanced Search Implementation
**Location**: `app/components/EventComponents.tsx`

```typescript
// Search input with enhanced placeholder
<input
  type="text"
  placeholder="Search events by title, description, or location..."
  value={localSearchQuery}
  onChange={e => {
    setLocalSearchQuery(e.target.value);
    if (onSearchAction) {
      onSearchAction(e.target.value, selectedTags || []);
    }
  }}
  className="w-full pl-10 pr-4 py-2 border rounded-lg bg-[var(--app-card-bg)] border-[var(--app-card-border)] text-[var(--app-foreground)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-transparent"
/>

// Search hints
<div className="text-xs text-[var(--app-foreground-muted)] mt-1 ml-1">
  💡 Try searching for "Zoom", "Lusaka", "Johannesburg", "online", or event names
</div>
```

### Location Filter
```typescript
{/* Location Filter */}
{allLocations.length > 0 && (
  <div className="flex flex-wrap gap-2">
    <span className="text-sm font-medium text-[var(--app-foreground)]">Location:</span>
    <button
      onClick={() => setSelectedLocation("")}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        selectedLocation === "" 
          ? "bg-[var(--app-accent)] text-white" 
          : "bg-[var(--app-gray)] text-[var(--app-foreground-muted)] hover:bg-[var(--app-gray-dark)]"
      }`}
    >
      All Locations
    </button>
    {allLocations.map(location => (
      <button
        key={location}
        onClick={() => setSelectedLocation(location)}
        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
          selectedLocation === location 
            ? "bg-[var(--app-accent)] text-white" 
            : "bg-[var(--app-gray)] text-[var(--app-foreground-muted)] hover:bg-[var(--app-gray-dark)]"
        }`}
      >
        {location}
      </button>
    ))}
  </div>
)}
```

### Tag Filter
```typescript
{allTags.length > 0 && (
  <div className="flex flex-wrap gap-2">
    <span className="text-sm font-medium text-[var(--app-foreground)]">Tags:</span>
    <button
      onClick={() => setSelectedTag("")}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        selectedTag === "" 
          ? "bg-[var(--app-accent)] text-white" 
          : "bg-[var(--app-gray)] text-[var(--app-foreground-muted)] hover:bg-[var(--app-gray-dark)]"
      }`}
    >
      All Tags
    </button>
    {allTags.map(tag => (
      <button
        key={tag}
        onClick={() => setSelectedTag(tag)}
        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
          selectedTag === tag 
            ? "bg-[var(--app-accent)] text-white" 
            : "bg-[var(--app-gray)] text-[var(--app-foreground-muted)] hover:bg-[var(--app-gray-dark)]"
        }`}
      >
        {tag}
      </button>
    ))}
  </div>
)}
```

## 📋 Event List Component

### Enhanced Event List
**Location**: `app/components/EventComponents.tsx` (lines 592-1000)

```typescript
export function EnhancedEventList({ 
  events, 
  onRSVPAction, 
  userAddress, 
  onEventClickAction,
  onCancelRSVPAction,
  onDeleteEventAction,
  onEditEventAction,
  onCancelEventAction,
  onDownloadCSVAction,
  onSearchAction,
  searchQuery,
  selectedTags,
  showSearch = true 
}: {
  events: Event[];
  // ... other props
}) {
  // Component implementation
}
```

### Event Card Structure
Each event is displayed as a card with:

```typescript
<div 
  key={`event-${event.id}-${index}`} 
  className={`bg-[var(--app-card-bg)] border rounded-xl p-4 hover:shadow-md transition-all duration-200 cursor-pointer relative ${
    event.status === 'cancelled' 
      ? 'border-red-300 bg-gradient-to-br from-red-50/30 to-red-100/20 shadow-sm' 
      : 'border-[var(--app-card-border)] hover:border-[var(--app-accent)]/30'
  }`}
  onClick={() => onEventClickAction && onEventClickAction(event)}
>
  {/* Event Image */}
  {event.imageUrl && (
    <div className="mb-2 flex justify-center">
      <img src={event.imageUrl} alt={event.title} className="max-h-40 rounded-lg object-cover w-full" />
    </div>
  )}
  
  {/* Event Title & Status */}
  <div className="flex justify-between items-start mb-2">
    <div className="flex-1">
      <h3 className="font-semibold text-[var(--app-foreground)] text-lg">{event.title}</h3>
      {/* Status badges */}
    </div>
  </div>
  
  {/* Event Details */}
  <div className="space-y-2 mb-4">
    <div className="flex items-center gap-2 text-sm text-[var(--app-foreground-muted)]">
      <Icon name="calendar" size="sm" />
      <span>{formatDate(event.date, event.time)}</span>
    </div>
    <div className="flex items-center gap-2 text-sm text-[var(--app-foreground-muted)]">
      <Icon name="map-pin" size="sm" />
      <span>{event.location}</span>
    </div>
  </div>
  
  {/* Action Buttons */}
  <div className="flex flex-wrap gap-2">
    {/* RSVP, Share, Edit, Delete buttons */}
  </div>
</div>
```

## 🎯 Key Features

### 1. Real-time Search
- **Backend Search**: Uses Supabase's `ilike` queries across title, description, and location
- **Frontend Filtering**: Client-side filtering for instant results
- **Combined Approach**: Backend for initial load, frontend for real-time filtering

### 2. Location-based Filtering
- **Dynamic Location List**: Automatically generates location buttons from existing events
- **One-click Filtering**: Click any location to filter events
- **Clear Filters**: "All Locations" button to reset filters

### 3. Tag-based Filtering
- **Dynamic Tag Generation**: Extracts unique tags from events
- **Multi-tag Support**: Events can have multiple tags
- **Visual Tag Display**: Tags are shown as colored badges

### 4. Event Status Management
- **Status Indicators**: Visual badges for upcoming, past, cancelled events
- **Conditional Actions**: Different buttons based on event status
- **Creator Controls**: Edit, delete, cancel options for event creators

### 5. Farcaster Integration
- **Share on Farcaster**: Rich sharing with event details and images
- **Mini App Features**: Optimized for Farcaster Mini App environment
- **Notification Support**: Welcome notifications when app is added

## 🎨 Styling System

### CSS Variables
The app uses CSS custom properties for consistent theming:

```css
:root {
  --app-background: #ffffff;
  --app-foreground: #000000;
  --app-card-bg: #f8f9fa;
  --app-card-border: #e9ecef;
  --app-accent: #007bff;
  --app-accent-hover: #0056b3;
  --app-gray: #6c757d;
  --app-gray-dark: #495057;
  --app-foreground-muted: #6c757d;
}
```

### Responsive Design
- **Mobile-first**: Optimized for mobile devices
- **Flexible Layout**: Adapts to different screen sizes
- **Touch-friendly**: Large touch targets for mobile interaction

## 🔧 Implementation Steps

### 1. Setup the Main Component
```typescript
// app/page.tsx
export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [events, setEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  // Load events on component mount
  useEffect(() => {
    loadEvents();
  }, []);
  
  return (
    <div className="min-h-screen bg-[var(--app-background)]">
      {/* Header */}
      {/* Tab Navigation */}
      {/* Tab Content */}
    </div>
  );
}
```

### 2. Implement Search Handler
```typescript
const handleSearch = async (query: string, tags: string[]) => {
  setSearchQuery(query);
  setSelectedTags(tags);
  
  try {
    if (query || tags.length > 0) {
      let filteredEvents: Event[] = [];
      
      if (query) {
        filteredEvents = await searchEvents(query);
      } else {
        filteredEvents = await getAllEvents();
      }
      
      // Filter by tags if provided
      if (tags.length > 0) {
        filteredEvents = filteredEvents.filter(event => 
          tags.some(tag => event.tags.includes(tag))
        );
      }
      
      setEvents(filteredEvents);
    } else {
      const allEvents = await getAllEvents();
      setEvents(allEvents);
    }
  } catch (error) {
    console.error("Failed to search events:", error);
  }
};
```

### 3. Create Event List Component
```typescript
// app/components/EventComponents.tsx
export function EnhancedEventList({ 
  events, 
  onRSVPAction, 
  userAddress, 
  onEventClickAction,
  // ... other props
}) {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery || "");
  const [selectedTag, setSelectedTag] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  
  // Get all unique tags and locations
  const allTags = Array.from(new Set(events.flatMap(event => event.tags)));
  const allLocations = Array.from(new Set(events.map(event => event.location).filter(Boolean)));
  
  // Filter events
  const filteredEvents = useMemo(() => {
    let filtered = events;
    
    if (localSearchQuery) {
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(localSearchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(localSearchQuery.toLowerCase()) ||
        event.location.toLowerCase().includes(localSearchQuery.toLowerCase())
      );
    }
    
    if (selectedTag) {
      filtered = filtered.filter(event => event.tags.includes(selectedTag));
    }
    
    if (selectedLocation) {
      filtered = filtered.filter(event => event.location === selectedLocation);
    }
    
    return filtered;
  }, [events, localSearchQuery, selectedTag, selectedLocation]);
  
  return (
    <div className="space-y-4">
      {/* Search Input */}
      {/* Location Filter */}
      {/* Tag Filter */}
      {/* Event Cards */}
    </div>
  );
}
```

### 4. Add Farcaster Integration
```typescript
// Farcaster sharing functionality
const shareEventOnFarcaster = useCallback((event: Event, shareType: 'created' | 'registered' | 'general' = 'general') => {
  const eventUrl = `${window.location.origin}/events/${event.id}`;
  
  // Format date inline
  const eventDate = new Date(`${event.date}T${event.time}`);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
  
  // Create rich text with event details
  let shareText = '';
  
  switch (shareType) {
    case 'created':
      shareText = `🎉 I just created an event!\n\n📅 ${event.title}\n📝 ${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}\n🕒 ${formattedDate}\n📍 ${event.location}`;
      break;
    case 'registered':
      shareText = `✅ I just registered for an event!\n\n📅 ${event.title}\n📝 ${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}\n🕒 ${formattedDate}\n📍 ${event.location}`;
      break;
    case 'general':
    default:
      shareText = `📅 Check out this event!\n\n🎯 ${event.title}\n📝 ${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}\n🕒 ${formattedDate}\n📍 ${event.location}`;
      break;
  }
  
  // Add event image as embed if available
  const embedUrl = event.imageUrl || eventUrl;
  openFarcasterCompose(shareText, embedUrl);
}, [openFarcasterCompose]);
```

## 🚀 Best Practices

### 1. Performance Optimization
- **Memoization**: Use `useMemo` for expensive computations
- **Debouncing**: Debounce search input to reduce API calls
- **Lazy Loading**: Load events in batches for large datasets

### 2. User Experience
- **Loading States**: Show loading indicators during data fetching
- **Error Handling**: Graceful error messages for failed operations
- **Empty States**: Helpful messages when no events are found

### 3. Accessibility
- **Keyboard Navigation**: Support for keyboard-only users
- **Screen Readers**: Proper ARIA labels and semantic HTML
- **Color Contrast**: Ensure sufficient contrast ratios

### 4. Mobile Optimization
- **Touch Targets**: Minimum 44px touch targets
- **Responsive Images**: Optimized images for different screen sizes
- **Swipe Gestures**: Consider adding swipe navigation

## 📱 Farcaster Mini App Considerations

### 1. Mini App Integration
```typescript
import { useMiniKit, useAddFrame, useOpenUrl } from "@coinbase/onchainkit/minikit";

export default function App() {
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  const addFrame = useAddFrame();
  const openUrl = useOpenUrl();
  
  // Handle Farcaster Mini App initialization
  useEffect(() => {
    if (context && !context.client.added) {
      setFrameReady();
    }
  }, [context, setFrameReady]);
}
```

### 2. Webhook Integration
```typescript
// app/api/webhook/route.ts
export async function POST(request: Request) {
  const body = await request.json();
  
  switch (body.event) {
    case "frame_added":
      // Send welcome notification
      await sendFrameNotification({
        fid: body.fid,
        title: `Welcome to EventFI`,
        body: `Thank you for adding EventFI`,
        notificationDetails: body.notificationDetails,
      });
      break;
  }
}
```

### 3. URL Handling
```typescript
// Handle URL parameters for tab navigation
useEffect(() => {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    
    if (tabParam && ['home', 'my-events', 'create', 'hosts', 'profile'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }
}, []);
```

## 🎯 Conclusion

The home screen implementation provides a comprehensive, user-friendly interface for the EventFI app. It combines powerful search and filtering capabilities with seamless Farcaster integration, creating an engaging experience for users to discover and interact with events.

Key highlights:
- **Rich Search**: Multi-field search with location and tag filtering
- **Responsive Design**: Works seamlessly across all devices
- **Farcaster Integration**: Native Mini App experience with rich sharing
- **Performance Optimized**: Efficient data loading and filtering
- **Accessibility Focused**: Inclusive design for all users

This implementation serves as a solid foundation for a modern event management application within the Farcaster ecosystem.
