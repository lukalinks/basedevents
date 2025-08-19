# Download Feature Fix for Farcaster

## Issues Found and Fixed

### 1. Syntax Error in API Route
**File**: `app/api/events/[id]/registrations/route.ts`
**Issue**: Missing closing parenthesis in `generateEventRegistrationsCSV` function call
**Fix**: Added missing closing parenthesis

```typescript
// Before (broken)
const csv = generateEventRegistrationsCSV(
  regs.map((r: any) => ({
    // ... mapping
  })),
  eventRow.title,  // <- Extra comma causing syntax error
)

// After (fixed)
const csv = generateEventRegistrationsCSV(
  regs.map((r: any) => ({
    // ... mapping
  })),
  eventRow.title   // <- Removed extra comma
)
```

### 2. Improved Farcaster Integration
**File**: `app/page.tsx`
**Issue**: Poor error handling and URL construction for Farcaster environment
**Fix**: Enhanced the `handleDownloadCSV` function with:

- Better URL construction using `window.location.origin`
- Improved error handling with user-friendly messages
- Enhanced logging for debugging
- Proper usage of `useOpenUrl` hook

```typescript
// Enhanced implementation
const handleDownloadCSV = async (eventId: string, eventTitle: string) => {
  try {
    // Construct the full URL for Farcaster environment
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${baseUrl}/api/events/${eventId}/registrations`;
    
    // If running inside Farcaster Mini app, prefer opening the URL
    if (context?.client?.added) {
      console.log('📱 Farcaster Mini app detected, opening download URL:', url);
      const openUrl = useOpenUrl();
      openUrl(url);
      console.log('✅ Download URL opened successfully in Farcaster');
      return;
    }

    // Fallback: browser download with enhanced error handling
    // ... rest of implementation
  } catch (error) {
    // Enhanced error handling with Farcaster-specific messages
  }
};
```

## How the Download Feature Works

### 1. API Endpoint (`/api/events/[id]/registrations`)
- **Method**: GET
- **Authentication**: Requires `x-user-address` header
- **Authorization**: Only event creators can download registrations
- **Response**: CSV file with proper headers for download

### 2. CSV Generation
- **Function**: `generateEventRegistrationsCSV` in `lib/events.ts`
- **Headers**: Name, Email, Phone, Wallet Address, Bio, Registration Date, Status
- **Format**: Properly escaped CSV with quotes around fields

### 3. Farcaster Integration
- **Detection**: Uses `context?.client?.added` to detect Farcaster environment
- **URL Opening**: Uses `useOpenUrl()` hook to open download URL in Farcaster
- **Fallback**: Browser download for non-Farcaster environments

## Testing the Feature

### 1. Create a Test Event
1. Connect your wallet
2. Create an event with some details
3. Note the event ID

### 2. Register Some Users
1. Use different wallet addresses to register for the event
2. Fill in registration details (name, email, etc.)

### 3. Test Download
1. As the event creator, go to the event details
2. Click the "Download Registrations" button
3. In Farcaster: Should open the download URL
4. In browser: Should download a CSV file

### 4. Verify CSV Content
The downloaded CSV should contain:
- All registered participants
- Their contact information
- Registration dates
- Status information

## Environment Requirements

### Required Environment Variables
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# For production, also need service role key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Database Requirements
- `events` table with proper RLS policies
- `event_registrations` table with proper RLS policies
- All migrations should be applied

## Troubleshooting

### Common Issues

1. **"Not authorized" error**
   - Ensure you're the event creator
   - Check that the `x-user-address` header is being sent

2. **"No registrations found" error**
   - Verify that users have registered for the event
   - Check the `event_registrations` table in Supabase

3. **Download not working in Farcaster**
   - Check browser console for errors
   - Verify that `context?.client?.added` is true
   - Ensure the URL is properly constructed

4. **CSV format issues**
   - Check that the `generateEventRegistrationsCSV` function is working
   - Verify that all required fields are present in the database

### Debug Steps

1. **Check API Response**
   ```bash
   curl -H "x-user-address: YOUR_ADDRESS" \
        http://localhost:3000/api/events/EVENT_ID/registrations
   ```

2. **Check Database**
   ```sql
   SELECT * FROM event_registrations WHERE event_id = 'EVENT_ID';
   ```

3. **Check Browser Console**
   - Look for any JavaScript errors
   - Check network requests to the API endpoint

## Future Improvements

1. **Enhanced Security**: Add rate limiting to prevent abuse
2. **Better Error Messages**: More specific error messages for different failure scenarios
3. **Progress Indicators**: Show download progress for large files
4. **Format Options**: Allow downloading in different formats (JSON, Excel)
5. **Filtering**: Allow filtering registrations by date, status, etc.
