# Event Components

This directory contains modular event-related components that were extracted from the large `EventComponents.tsx` file for better maintainability and organization.

## Components

### `EventForm.tsx`
- **EnhancedEventForm**: A comprehensive form for creating and editing events
- Features: Image upload, token gating, payment settings, online/physical mode, tags, recurring events

### `EventList.tsx`
- **EnhancedEventList**: Displays a list of events with search, filtering, and management options
- Features: Search functionality, location/tag filters, RSVP actions, event management buttons

### `EventDetailsModal.tsx`
- **EnhancedEventDetailsModal**: Modal for viewing detailed event information
- Features: Registration status, comments, attendee list, calendar integration, sharing

### `EventRegistrationForm.tsx`
- **EventRegistrationForm**: Form for users to register for events
- Features: Payment integration, token verification, user details collection

### `EventAttendeesList.tsx`
- **EventAttendeesList**: Displays detailed attendee information for event hosts
- Features: User display info, registration details, Base Name integration

### `UserNFTTicketsCollection.tsx`
- **UserNFTTicketsCollection**: Shows user's collected NFT event tickets
- Features: NFT display, blockchain links, collection management

### `ConfirmationModal.tsx`
- **ConfirmationModal**: Reusable confirmation dialog for destructive actions
- Features: Warning/danger variants, customizable messages

## Usage

### Import individual components:
```typescript
import { EnhancedEventForm } from '@/components/events/EventForm';
import { EnhancedEventList } from '@/components/events/EventList';
```

### Import from the events index:
```typescript
import { 
  EnhancedEventForm, 
  EnhancedEventList,
  EventRegistrationForm 
} from '@/components/events';
```

### Import from the main EventComponents (legacy):
```typescript
import { EnhancedEventForm } from '@/components/EventComponents';
```

## Benefits of Modular Structure

1. **Maintainability**: Each component is focused on a single responsibility
2. **Reusability**: Components can be imported individually as needed
3. **Testing**: Easier to write unit tests for individual components
4. **Performance**: Better tree-shaking and code splitting
5. **Collaboration**: Multiple developers can work on different components simultaneously
6. **Debugging**: Easier to locate and fix issues in specific components

## File Structure

```
app/components/events/
├── index.ts                    # Main exports
├── README.md                   # This documentation
├── EventForm.tsx              # Event creation/editing form
├── EventList.tsx              # Event listing with search/filters
├── EventDetailsModal.tsx      # Event details modal
├── EventRegistrationForm.tsx  # User registration form
├── EventAttendeesList.tsx     # Attendee management
├── UserNFTTicketsCollection.tsx # NFT tickets display
└── ConfirmationModal.tsx      # Confirmation dialogs
```

## Migration Notes

The original `EventComponents.tsx` file has been refactored to re-export all components from this modular structure. This ensures backward compatibility while providing the benefits of modular organization.

All existing imports from `@/components/EventComponents` will continue to work without changes.
