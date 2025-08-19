/**
 * Farcaster utility functions for the mini-app
 */

// Cache for address to FID mappings
const addressToFidCache = new Map<string, number>();

/**
 * Convert wallet address to Farcaster ID (FID)
 * This would typically use Farcaster API or a service like Neynar
 */
export async function getAddressFid(address: string): Promise<number | null> {
  if (!address) return null;

  // Check cache first
  if (addressToFidCache.has(address)) {
    return addressToFidCache.get(address)!;
  }

  try {
    // Prefer server-side resolution via Neynar if available
    if (typeof window === 'undefined' && process.env.NEYNAR_API_KEY) {
      const url = `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${encodeURIComponent(address)}`;
      const response = await fetch(url, {
        headers: { 'api_key': process.env.NEYNAR_API_KEY as string },
      });
      if (response.ok) {
        const data = await response.json();
        const user = Array.isArray(data?.users) ? data.users[0] : undefined;
        if (user?.fid) {
          addressToFidCache.set(address, user.fid);
          return user.fid as number;
        }
      } else {
        const text = await response.text().catch(() => '');
        console.warn('Neynar FID lookup failed:', response.status, text);
      }
    }

    console.log(`No FID found for address: ${address}`);
    return null;
  } catch (error) {
    console.error('Error getting FID for address:', address, error);
    return null;
  }
}

/**
 * Send notification to event creator when someone registers
 */
export async function notifyEventCreator(
  creatorAddress: string,
  eventTitle: string,
  _registrantAddress: string
) {
  try {
    // Defer FID resolution to server to avoid exposing API keys in client
    const response = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creatorAddress,
        notification: {
          title: `New Registration for ${eventTitle}`,
          body: `Someone just registered for your event!`,
          notificationDetails: null
        }
      })
    });

    if (response.ok) {
      const resJson = await response.json().catch(() => ({}));
      if (resJson?.state === 'no_token') {
        console.log('Creator has not enabled notifications for this app.');
        return false;
      }
      return true;
    } else {
      console.error('Failed to send notification:', await response.text());
      return false;
    }
  } catch (error) {
    console.error('Error sending creator notification:', error);
    return false;
  }
}

/**
 * Send notification for event reminders
 */
export async function sendEventReminder(
  attendeeAddress: string,
  eventTitle: string,
  eventDate: string
) {
  try {
    const attendeeFid = await getAddressFid(attendeeAddress);
    
    if (!attendeeFid) {
      console.log(`Attendee ${attendeeAddress} not found on Farcaster, skipping reminder`);
      return false;
    }

    const response = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fid: attendeeFid,
        notification: {
          title: `Reminder: ${eventTitle}`,
          body: `Your event is coming up on ${eventDate}!`,
          notificationDetails: null
        }
      })
    });

    if (response.ok) {
      console.log(`✅ Event reminder sent to attendee FID: ${attendeeFid}`);
      return true;
    } else {
      console.error('Failed to send reminder:', await response.text());
      return false;
    }
  } catch (error) {
    console.error('Error sending event reminder:', error);
    return false;
  }
}

/**
 * Check if a user has Farcaster notifications enabled
 */
export async function hasNotificationsEnabled(address: string): Promise<boolean> {
  try {
    const fid = await getAddressFid(address);
    if (!fid) return false;

    // Check if user has notification details stored (from our Redis)
    const response = await fetch(`/api/user-notifications/${fid}`);
    return response.ok;
  } catch (error) {
    console.error('Error checking notification status:', error);
    return false;
  }
}
