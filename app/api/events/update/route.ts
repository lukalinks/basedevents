import { NextResponse } from "next/server";
import { notifyEventUpdate, notifySpecificAttendees } from "@/lib/farcaster";

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
      targetAttendees = 'all' // 'all' or 'specific' array
    } = body as {
      eventId: string;
      eventTitle: string;
      eventDate: string;
      attendeeAddresses: string[];
      updateMessage: string;
      updateType?: 'general' | 'schedule' | 'location' | 'important';
      targetAttendees?: 'all' | string[];
    };

    if (!eventId || !eventTitle || !updateMessage || !attendeeAddresses) {
      return NextResponse.json(
        { error: "Missing required fields: eventId, eventTitle, updateMessage, attendeeAddresses" },
        { status: 400 }
      );
    }

    let results;

    if (targetAttendees === 'all') {
      // Send to all attendees
      results = await notifyEventUpdate(
        eventTitle,
        eventDate,
        attendeeAddresses,
        updateMessage,
        updateType
      );
    } else if (Array.isArray(targetAttendees)) {
      // Send to specific attendees only
      const targetAddresses = attendeeAddresses.filter(addr => 
        targetAttendees.includes(addr)
      );
      
      results = await notifySpecificAttendees(
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

    // Calculate success metrics
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const total = results.length;

    return NextResponse.json({ 
      success: true, 
      results,
      summary: {
        total,
        successful,
        failed,
        successRate: total > 0 ? (successful / total * 100).toFixed(1) + '%' : '0%'
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