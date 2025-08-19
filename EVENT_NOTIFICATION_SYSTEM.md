# Event Notification System

## Overview

The Event Notification System ensures that users receive Farcaster notifications when events are cancelled or deleted. This system provides real-time updates to all attendees and event creators, maintaining transparency and keeping users informed about important changes.

## Features

### ✅ Implemented Notifications

1. **Event Cancellation Notifications**
   - Notifies all attendees when an event is cancelled
   - Notifies the event creator about the cancellation
   - Includes event title and date in the notification

2. **Event Deletion Notifications**
   - Notifies all attendees when an event is deleted
   - Notifies the event creator about the deletion
   - Includes event title and date in the notification

3. **RSVP Cancellation Notifications**
   - Notifies event creator when someone cancels their RSVP
   - Helps creators track attendance changes

4. **Event Registration Notifications**
   - Notifies event creator when someone registers for their event
   - Already implemented in the existing system

## Architecture

### Core Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Event Action  │───▶│  Notification    │───▶│  Farcaster API  │
│  (Cancel/Delete)│    │     Service      │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   Attendees &    │
                       │   Creator FIDs   │
                       └──────────────────┘
```

### File Structure

```
lib/
├── farcaster.ts              # Core notification functions
├── events.ts                 # Event CRUD operations with notifications
└── notification-client.ts    # Farcaster notification client

app/api/
├── notify/route.ts           # General notification endpoint
├── events/notify/route.ts    # Event-specific notification endpoint
└── webhook/route.ts          # Farcaster webhook handler

test/
└── notification-test.ts      # Comprehensive test suite
```

## Implementation Details

### 1. Notification Functions (`lib/farcaster.ts`)

#### `notifyEventCancellation(eventTitle, eventDate, attendeeAddresses)`
- Sends cancellation notifications to all attendees
- Returns detailed results for each notification attempt
- Handles users without Farcaster accounts gracefully

#### `notifyEventDeletion(eventTitle, eventDate, attendeeAddresses)`
- Sends deletion notifications to all attendees
- Similar structure to cancellation notifications
- Provides comprehensive error handling

#### `notifyEventCreatorOfCancellation(creatorAddress, eventTitle, action)`
- Notifies event creator about cancellation/deletion
- Supports both 'cancelled' and 'deleted' actions
- Handles creators without notifications enabled

### 2. Event Functions (`lib/events.ts`)

#### `cancelEvent(eventId)`
- Fetches event data before cancellation
- Updates event status to 'cancelled'
- Sends notifications to all attendees and creator
- Returns updated event object

#### `deleteEvent(eventId)`
- Fetches event data before deletion
- Deletes event from database
- Sends notifications to all attendees and creator
- Handles cleanup gracefully

#### `cancelRsvp(eventId, userAddress)`
- Removes user from attendees list
- Notifies event creator about RSVP cancellation
- Returns updated event object

### 3. API Endpoints

#### `/api/events/notify` (POST)
```typescript
{
  action: 'cancel' | 'delete',
  eventTitle: string,
  eventDate: string,
  attendeeAddresses: string[],
  creatorAddress?: string
}
```

#### `/api/notify` (POST)
```typescript
{
  fid?: number,
  creatorAddress?: string,
  notification: {
    title: string,
    body: string,
    notificationDetails?: any
  }
}
```

## Testing

### Running Tests

```bash
# Run all notification tests
npm test test/notification-test.ts

# Run specific test suite
npm test -- --grep "Event Cancellation Notifications"
```

### Test Coverage

The test suite covers:

1. **Event Cancellation Notifications**
   - Successful notifications to multiple attendees
   - Handling attendees without Farcaster accounts
   - API error handling

2. **Event Deletion Notifications**
   - Successful notifications to attendees
   - Error handling scenarios

3. **Event Creator Notifications**
   - Cancellation notifications to creators
   - Deletion notifications to creators
   - Handling creators without notifications enabled

4. **FID Resolution**
   - Successful address to FID conversion
   - Handling addresses without Farcaster accounts

### Manual Testing

#### Test Event Cancellation

1. Create an event with multiple attendees
2. Cancel the event as the creator
3. Verify notifications are sent to all attendees
4. Verify creator receives confirmation notification

#### Test Event Deletion

1. Create an event with multiple attendees
2. Delete the event as the creator
3. Verify notifications are sent to all attendees
4. Verify creator receives confirmation notification

#### Test RSVP Cancellation

1. Register for an event
2. Cancel your RSVP
3. Verify event creator receives notification

## Error Handling

### Graceful Degradation

- **No Farcaster Account**: Users without Farcaster accounts are skipped without errors
- **API Failures**: Notification failures don't prevent event actions from completing
- **Rate Limiting**: System handles Farcaster API rate limits gracefully
- **Network Issues**: Temporary network issues are logged but don't break functionality

### Error Types

```typescript
type NotificationResult = {
  address: string;
  success: boolean;
  reason?: 'no_fid' | 'api_error' | 'exception';
  fid?: number;
}
```

### Logging

All notification attempts are logged with:
- Success/failure status
- FID resolution results
- API response details
- Error messages for debugging

## Configuration

### Environment Variables

```bash
# Required for FID resolution
NEYNAR_API_KEY=your_neynar_api_key

# Required for notifications
NEXT_PUBLIC_URL=your_app_url
NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME=your_project_name
```

### Notification Preferences

Users can control their notification preferences through:
- Farcaster Frame SDK settings
- App-specific notification controls
- Global Farcaster notification settings

## Best Practices

### 1. Performance
- Notifications are sent asynchronously to avoid blocking event actions
- Batch processing for multiple attendees
- Caching of FID resolutions to reduce API calls

### 2. User Experience
- Clear, informative notification messages
- Consistent notification format across all event types
- Respect for user notification preferences

### 3. Reliability
- Comprehensive error handling
- Retry logic for failed notifications
- Detailed logging for debugging

### 4. Privacy
- Only necessary information included in notifications
- Secure handling of user data
- Compliance with Farcaster privacy guidelines

## Troubleshooting

### Common Issues

#### Notifications Not Sending
1. Check if users have Farcaster accounts
2. Verify notification preferences are enabled
3. Check API rate limits
4. Review server logs for errors

#### Missing FID Resolution
1. Verify Neynar API key is configured
2. Check if address has associated Farcaster account
3. Review API response logs

#### Event Actions Failing
1. Check database connectivity
2. Verify user permissions
3. Review event data integrity

### Debug Commands

```bash
# Check notification status for a user
curl -X GET "http://localhost:3000/api/user-notifications/{fid}"

# Test notification sending
curl -X POST "http://localhost:3000/api/notify" \
  -H "Content-Type: application/json" \
  -d '{"fid": 123, "notification": {"title": "Test", "body": "Test notification"}}'
```

## Future Enhancements

### Planned Features

1. **Scheduled Notifications**
   - Event reminders before start time
   - Follow-up notifications after events

2. **Rich Notifications**
   - Event images in notifications
   - Action buttons for quick responses

3. **Notification Analytics**
   - Track notification delivery rates
   - User engagement metrics

4. **Advanced Preferences**
   - Granular notification controls
   - Quiet hours settings
   - Notification frequency limits

### Integration Opportunities

1. **XMTP Integration**
   - Direct messaging for urgent notifications
   - Group chat for event updates

2. **On-chain Events**
   - Smart contract event notifications
   - Token-gated event updates

3. **External Platforms**
   - Email notifications as fallback
   - SMS notifications for critical updates

## Conclusion

The Event Notification System provides a robust, user-friendly way to keep event participants informed about important changes. With comprehensive error handling, detailed logging, and extensive testing, the system ensures reliable delivery of notifications while maintaining excellent user experience.

For questions or issues, please refer to the troubleshooting section or contact the development team.