import { NextResponse } from "next/server";
import { notifyEventUpdate, notifySpecificAttendees } from "@/lib/farcaster";
import { addInAppNotification } from "@/lib/inapp";
import { sendPushToAddress } from "@/lib/push";
import { sendEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      eventId,
      eventTitle, 
      eventDate, 
      attendeeAddresses, 
      updateMessage,
      updateType = 'general',
      targetAttendees = 'all', // 'all' or 'specific' array
      emailByAddress
    } = body as {
      eventId: string;
      eventTitle: string;
      eventDate: string;
      attendeeAddresses: string[];
      updateMessage: string;
      updateType?: 'general' | 'schedule' | 'location' | 'important';
      targetAttendees?: 'all' | string[];
      emailByAddress?: Record<string, string>;
    };

    if (!eventId || !eventTitle || !updateMessage || !attendeeAddresses) {
      return NextResponse.json(
        { error: "Missing required fields: eventId, eventTitle, updateMessage, attendeeAddresses" },
        { status: 400 }
      );
    }

    let farcasterResults;

    // Determine target list
    const targetAddresses = targetAttendees === 'all'
      ? attendeeAddresses
      : Array.isArray(targetAttendees)
        ? attendeeAddresses.filter(addr => targetAttendees.includes(addr))
        : [];

    if (targetAttendees === 'all') {
      farcasterResults = await notifyEventUpdate(
        eventTitle,
        eventDate,
        attendeeAddresses,
        updateMessage,
        updateType
      );
    } else if (Array.isArray(targetAttendees)) {
      farcasterResults = await notifySpecificAttendees(
        targetAddresses,
        `Event Update: ${eventTitle}`,
        updateMessage,
        {
          eventTitle,
          eventDate,
          updateType,
          timestamp: new Date().toISOString()
        }
      );
    } else {
      return NextResponse.json(
        { error: "Invalid targetAttendees format" },
        { status: 400 }
      );
    }

    // Fan-out: In-app, Web Push, Email (best-effort, non-blocking)
    const broadcastPromises: Promise<any>[] = [];

    for (const addr of targetAddresses) {
      // In-app
      broadcastPromises.push(addInAppNotification(addr, {
        title: updateType === 'general' ? `Event Update: ${eventTitle}`
              : updateType === 'schedule' ? `Schedule Change: ${eventTitle}`
              : updateType === 'location' ? `Location Update: ${eventTitle}`
              : `Important Update: ${eventTitle}`,
        body: updateMessage,
        data: { eventId, eventTitle, eventDate, updateType }
      }));

      // Web push
      broadcastPromises.push(sendPushToAddress(addr, {
        title: `Event Update: ${eventTitle}`,
        body: updateMessage,
        data: { url: `${process.env.NEXT_PUBLIC_URL || ''}/events/${eventId}` }
      }));

      // Email (if provided)
      const email = emailByAddress?.[addr.toLowerCase()];
      if (email) {
        const subject = updateType === 'general' ? `Event Update: ${eventTitle}`
          : updateType === 'schedule' ? `Schedule Change: ${eventTitle}`
          : updateType === 'location' ? `Location Update: ${eventTitle}`
          : `Important Update: ${eventTitle}`;
        const html = `
          <div style="font-family:sans-serif;">
            <h2>${subject}</h2>
            <p>${updateMessage}</p>
            <p><strong>Date:</strong> ${eventDate || ''}</p>
            <p><a href="${(process.env.NEXT_PUBLIC_URL || '') + '/events/' + eventId}" target="_blank">View event</a></p>
          </div>`;
        broadcastPromises.push(sendEmail({ to: email, subject, html }));
      }
    }

    await Promise.allSettled(broadcastPromises);

    // Calculate success metrics for Farcaster
    const successful = farcasterResults.filter((r: any) => r.success).length;
    const failed = farcasterResults.filter((r: any) => !r.success).length;
    const total = farcasterResults.length;

    return NextResponse.json({ 
      success: true, 
      farcaster: {
        results: farcasterResults,
        summary: {
          total,
          successful,
          failed,
          successRate: total > 0 ? (successful / total * 100).toFixed(1) + '%' : '0%'
        }
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error in event update notification API:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}