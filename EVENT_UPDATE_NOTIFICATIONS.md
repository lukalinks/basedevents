# Event Update Notification System

## Overview

The Event Update Notification System allows event hosts to send **real-time custom notifications** to their event attendees. This system extends the existing Farcaster notification infrastructure to provide hosts with a powerful way to communicate updates, changes, and important information to their event participants.

## 🚀 Key Features

### ✅ **What's New**
1. **Custom Update Messages** - Hosts can write personalized update messages
2. **Multiple Update Types** - Categorized updates (general, schedule, location, important)
3. **Targeted Notifications** - Send to all attendees or specific individuals
4. **Real-time Delivery** - Instant Farcaster push notifications
5. **Comprehensive Reporting** - Success/failure metrics for each notification

### 🔄 **Update Types Available**
- **📢 General** - General announcements and updates
- **🕒 Schedule** - Time changes, agenda updates
- **📍 Location** - Venue changes, directions
- **⚠️ Important** - Urgent announcements, critical updates

## 🏗️ Architecture

### Core Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Event Host    │───▶│  Update API      │───▶│  Farcaster     │
│   (React UI)    │    │  (/api/events/   │    │  Notifications │
│                  │    │   update)        │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   Attendee       │
                       │   Addresses      │
                       └──────────────────┘
```

### File Structure

```
lib/
├── farcaster.ts              # Core notification functions (enhanced)
│   ├── notifyEventUpdate()   # Send updates to all attendees
│   └── notifySpecificAttendees() # Send to specific attendees
│
app/api/events/
├── update/route.ts           # New update notification endpoint
│
app/components/
├── EventUpdateNotification.tsx # React component for hosts
│
test/
├── test-event-updates.js     # Test script for new functionality
```

## 📱 User Interface

### EventUpdateNotification Component

The `EventUpdateNotification` component provides a user-friendly interface for event hosts to:

1. **Select Update Type** - Choose from 4 predefined categories
2. **Target Audience** - Send to all attendees or select specific individuals
3. **Write Message** - Compose custom update messages (up to 500 characters)
4. **Send Updates** - One-click notification delivery
5. **View Results** - See delivery success rates and failed attempts

### Component Features

- **Responsive Design** - Works on desktop and mobile
- **Real-time Validation** - Prevents sending empty messages
- **Progress Indicators** - Loading states and success feedback
- **Error Handling** - Clear error messages and recovery options
- **Accessibility** - Proper labels and keyboard navigation

## 🔌 API Endpoints

### `/api/events/update` (POST)

**Purpose**: Send custom event updates to attendees

**Request Body**:
```typescript
{
  eventId: string;                    // Required: Unique event identifier
  eventTitle: string;                 // Required: Event title for context
  eventDate: string;                  // Required: Event date for context
  attendeeAddresses: string[];        // Required: Array of attendee wallet addresses
  updateMessage: string;              // Required: Custom update message
  updateType?: 'general' | 'schedule' | 'location' | 'important'; // Optional: Defaults to 'general'
  targetAttendees?: 'all' | string[]; // Optional: 'all' or array of specific addresses
}
```

**Response**:
```typescript
{
  success: boolean;
  results: NotificationResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    successRate: string;
  };
}
```

**Example Usage**:
```bash
curl -X POST "http://localhost:3000/api/events/update" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "event-123",
    "eventTitle": "Tech Conference 2024",
    "eventDate": "Dec 25, 2024",
    "attendeeAddresses": ["0x1234...", "0x5678..."],
    "updateMessage": "The event time has changed to 3:00 PM",
    "updateType": "schedule",
    "targetAttendees": "all"
  }'
```

## 🧪 Testing

### Running Tests

```bash
# Test the new event update system
npm run test:event-updates

# Test all notification systems
npm run test:notifications

# Test everything
npm run test:all
```

### Test Coverage

The test suite covers:

1. **Update Types**
   - General updates
   - Schedule changes
   - Location updates
   - Important announcements

2. **Targeting Options**
   - All attendees
   - Specific attendees
   - Error handling for invalid selections

3. **API Validation**
   - Required field validation
   - Error response handling
   - Success metrics calculation

4. **Notification Delivery**
   - FID resolution
   - Farcaster API integration
   - Success/failure tracking

## 📊 Usage Examples

### 1. **Schedule Change Notification**
```typescript
// Host wants to notify about time change
const updateData = {
  eventId: "event-456",
  eventTitle: "Blockchain Workshop",
  eventDate: "Dec 30, 2024",
  attendeeAddresses: ["0x1234...", "0x5678..."],
  updateMessage: "The workshop start time has been moved from 2:00 PM to 3:00 PM due to speaker availability.",
  updateType: "schedule",
  targetAttendees: "all"
};
```

### 2. **Location Update**
```typescript
// Host needs to change venue
const updateData = {
  eventId: "event-789",
  eventTitle: "Networking Mixer",
  eventDate: "Jan 5, 2025",
  attendeeAddresses: ["0x1234...", "0x5678..."],
  updateMessage: "Due to construction at the original venue, the event has been moved to the Grand Ballroom at 123 Main Street.",
  updateType: "location",
  targetAttendees: "all"
};
```

### 3. **Important Announcement**
```typescript
// Host has urgent information
const updateData = {
  eventId: "event-101",
  eventTitle: "Outdoor Festival",
  eventDate: "Jan 10, 2025",
  attendeeAddresses: ["0x1234...", "0x5678..."],
  updateMessage: "URGENT: Due to severe weather forecast, the festival has been moved indoors. Please bring warm clothing as the venue will be air-conditioned.",
  updateType: "important",
  targetAttendees: "all"
};
```

### 4. **Targeted Message**
```typescript
// Host wants to message specific attendees
const updateData = {
  eventId: "event-202",
  eventTitle: "VIP Dinner",
  eventDate: "Jan 15, 2025",
  attendeeAddresses: ["0x1234...", "0x5678...", "0x9012..."],
  updateMessage: "You've been selected for the exclusive VIP dinner experience. Please arrive 30 minutes early for special arrangements.",
  updateType: "general",
  targetAttendees: ["0x1234...", "0x9012..."] // Only specific addresses
};
```

## 🔧 Integration Guide

### 1. **Add to Event Management Page**

```tsx
import EventUpdateNotification from '@/components/EventUpdateNotification';

function EventManagementPage({ event }) {
  return (
    <div>
      <h1>Manage Event: {event.title}</h1>
      
      {/* Other event management components */}
      
      <EventUpdateNotification
        eventId={event.id}
        eventTitle={event.title}
        eventDate={event.date}
        attendeeAddresses={event.attendees.map(a => a.address)}
        onUpdateSent={(results) => {
          console.log('Update sent:', results);
          // Handle success (e.g., show toast, refresh data)
        }}
      />
    </div>
  );
}
```

### 2. **Add to Event Details Modal**

```tsx
function EventDetailsModal({ event, isOpen, onClose }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <h2>{event.title}</h2>
        
        {/* Event details */}
        
        {event.isHost && (
          <EventUpdateNotification
            eventId={event.id}
            eventTitle={event.title}
            eventDate={event.date}
            attendeeAddresses={event.attendees.map(a => a.address)}
          />
        )}
      </div>
    </Modal>
  );
}
```

### 3. **Add to Host Dashboard**

```tsx
function HostDashboard() {
  const [events, setEvents] = useState([]);
  
  return (
    <div>
      <h1>My Events</h1>
      
      {events.map(event => (
        <div key={event.id} className="event-card">
          <h3>{event.title}</h3>
          
          {/* Quick actions */}
          <div className="actions">
            <button>Edit Event</button>
            <button>View Attendees</button>
            <button>Send Update</button>
          </div>
          
          {/* Update notification component */}
          <EventUpdateNotification
            eventId={event.id}
            eventTitle={event.title}
            eventDate={event.date}
            attendeeAddresses={event.attendees.map(a => a.address)}
          />
        </div>
      ))}
    </div>
  );
}
```

## 🛡️ Security & Privacy

### Access Control
- Only event hosts can send updates
- Wallet address verification required
- Event ownership validation

### Data Protection
- Attendee addresses are not stored permanently
- Update messages are not logged with personal information
- FID resolution is temporary and cached

### Rate Limiting
- Farcaster API rate limits are respected
- Notification batching for large attendee lists
- Graceful degradation on API failures

## 📈 Performance & Scalability

### Optimization Features
- **FID Caching** - Reduces API calls for repeated addresses
- **Batch Processing** - Efficient handling of multiple attendees
- **Async Operations** - Non-blocking notification delivery
- **Error Recovery** - Continues processing on individual failures

### Scalability Considerations
- **Horizontal Scaling** - API endpoints can be load balanced
- **Database Optimization** - Minimal database impact
- **External Service Limits** - Respects Farcaster API constraints
- **Monitoring** - Comprehensive logging for performance tracking

## 🔍 Monitoring & Analytics

### Success Metrics
- **Delivery Rate** - Percentage of successful notifications
- **Response Time** - Time from API call to notification delivery
- **Error Rates** - Breakdown of failure reasons
- **User Engagement** - Notification interaction rates

### Logging
```typescript
// Example log entry
{
  timestamp: "2024-12-20T10:30:00Z",
  eventId: "event-123",
  updateType: "schedule",
  targetCount: 25,
  successCount: 23,
  failureCount: 2,
  failureReasons: ["no_fid", "api_error"],
  processingTime: "1.2s"
}
```

## 🚨 Troubleshooting

### Common Issues

#### 1. **Notifications Not Sending**
- Check if users have Farcaster accounts
- Verify notification preferences are enabled
- Check API rate limits
- Review server logs for errors

#### 2. **Low Success Rates**
- Verify attendee addresses are correct
- Check Farcaster account status
- Monitor API response times
- Review error logs for patterns

#### 3. **Component Not Rendering**
- Check component import path
- Verify required props are passed
- Check browser console for errors
- Ensure React context is properly set up

### Debug Commands

```bash
# Test specific update type
curl -X POST "http://localhost:3000/api/events/update" \
  -H "Content-Type: application/json" \
  -d '{"eventId":"test","eventTitle":"Test","eventDate":"2024-12-25","attendeeAddresses":["0x1234..."],"updateMessage":"Test","updateType":"schedule"}'

# Check notification status
curl -X GET "http://localhost:3000/api/user-notifications/12345"
```

## 🔮 Future Enhancements

### Planned Features
1. **Scheduled Updates** - Send notifications at specific times
2. **Rich Media** - Include images, links, or attachments
3. **Update Templates** - Pre-written common update messages
4. **Analytics Dashboard** - Visual notification performance metrics
5. **Multi-language Support** - Localized notification content

### Integration Opportunities
1. **Email Fallback** - Send email notifications for non-Farcaster users
2. **SMS Integration** - Critical updates via text message
3. **Webhook Support** - Integrate with external notification services
4. **Chat Integration** - Discord, Telegram, or Slack notifications

## 📚 API Reference

### Functions

#### `notifyEventUpdate(eventTitle, eventDate, attendeeAddresses, updateMessage, updateType)`
Sends update notifications to all event attendees.

**Parameters**:
- `eventTitle` (string): Title of the event
- `eventDate` (string): Date of the event
- `attendeeAddresses` (string[]): Array of attendee wallet addresses
- `updateMessage` (string): Custom update message
- `updateType` (string): Type of update ('general', 'schedule', 'location', 'important')

**Returns**: Promise<NotificationResult[]>

#### `notifySpecificAttendees(attendeeAddresses, title, message, notificationDetails)`
Sends notifications to specific attendees only.

**Parameters**:
- `attendeeAddresses` (string[]): Array of target attendee addresses
- `title` (string): Notification title
- `message` (string): Notification message
- `notificationDetails` (any): Additional notification data

**Returns**: Promise<NotificationResult[]>

### Types

```typescript
type NotificationResult = {
  address: string;
  success: boolean;
  reason?: 'no_fid' | 'api_error' | 'exception';
  fid?: number;
};

type UpdateType = 'general' | 'schedule' | 'location' | 'important';

type TargetAttendees = 'all' | string[];
```

## 🎉 Conclusion

The Event Update Notification System provides event hosts with a powerful, user-friendly way to communicate with their attendees in real-time. With comprehensive error handling, multiple update types, and flexible targeting options, hosts can ensure their attendees stay informed about important changes and updates.

The system integrates seamlessly with the existing Farcaster notification infrastructure while providing new capabilities specifically designed for event management scenarios.

For questions or support, please refer to the troubleshooting section or contact the development team.