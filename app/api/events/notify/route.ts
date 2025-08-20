import { NextResponse } from "next/server";
import { 
  notifyEventCancellation, 
  notifyEventDeletion, 
  notifyEventCreatorOfCancellation 
} from "@/lib/farcaster";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      action, 
      eventTitle, 
      eventDate, 
      attendeeAddresses, 
      creatorAddress 
    } = body as {
      action: 'cancel' | 'delete';
      eventTitle: string;
      eventDate: string;
      attendeeAddresses: string[];
      creatorAddress?: string;
    };

    let results = {
      attendeeNotifications: [],
      creatorNotification: null
    };

    // Send notifications to attendees
    if (attendeeAddresses && attendeeAddresses.length > 0) {
      if (action === 'cancel') {
        results.attendeeNotifications = await notifyEventCancellation(
          eventTitle,
          eventDate,
          attendeeAddresses
        );
      } else if (action === 'delete') {
        results.attendeeNotifications = await notifyEventDeletion(
          eventTitle,
          eventDate,
          attendeeAddresses
        );
      }
    }

    // Send notification to creator
    if (creatorAddress) {
      results.creatorNotification = await notifyEventCreatorOfCancellation(
        creatorAddress,
        eventTitle,
        action === 'cancel' ? 'cancelled' : 'deleted'
      );
    }

    return NextResponse.json({ 
      success: true, 
      results 
    }, { status: 200 });

  } catch (error) {
    console.error('Error in event notification API:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}