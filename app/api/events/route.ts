import { NextRequest, NextResponse } from "next/server";
import {
  createEvent,
  getAllEvents,
  updateEvent,
  rsvpToEvent,
  cancelRsvp,
  searchEvents,
} from "../../../lib/events";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    const tags = searchParams.get("tags")?.split(",").filter(Boolean) || [];
    
    let events;
    if (query || tags.length > 0) {
      events = await searchEvents(query || "", tags);
    } else {
      events = await getAllEvents();
    }
    
    return NextResponse.json({ events });
  } catch (error) {
    console.error("Failed to fetch events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, creator } = body;
    
    if (!event || !creator) {
      return NextResponse.json(
        { error: "Event data and creator are required" },
        { status: 400 }
      );
    }
    
    const eventData = { ...event, creator };
    const newEvent = await createEvent(eventData);
    return NextResponse.json({ event: newEvent });
  } catch (error) {
    console.error("Failed to create event:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, event } = body;
    
    if (!eventId || !event) {
      return NextResponse.json(
        { error: "Event ID and event data are required" },
        { status: 400 }
      );
    }
    
    const updatedEvent = await updateEvent(eventId, event);
    return NextResponse.json({ event: updatedEvent });
  } catch (error) {
    console.error("Failed to update event:", error);
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");
    const requester = request.headers.get('x-user-address') || '';
    
    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }
    if (!requester) {
      return NextResponse.json(
        { error: "Missing user address" },
        { status: 400 }
      );
    }

    // Ensure admin client is available
    console.log('🔍 Delete request debug:', {
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasSupabaseAdmin: !!supabaseAdmin,
      eventId,
      requester,
      serviceRoleKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
    });
    
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !supabaseAdmin) {
      console.error("Missing SUPABASE_SERVICE_ROLE_KEY or admin client not initialized");
      console.error('SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
      console.error('supabaseAdmin exists:', !!supabaseAdmin);
      return NextResponse.json({ error: "Server not configured for deletes" }, { status: 500 });
    }

    // Verify requester is the creator of the event
    const { data: eventRow, error: fetchError } = await supabaseAdmin
      .from('events')
      .select('creator')
      .eq('id', eventId)
      .single();
    if (fetchError) {
      console.error('Failed to fetch event for delete check:', fetchError);
      return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
    }
    if (!eventRow) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    // Case-insensitive address comparison for authorization
    if (eventRow.creator.toLowerCase() !== requester.toLowerCase()) {
      return NextResponse.json({ error: 'Not authorized to delete this event' }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from("events")
      .delete()
      .eq("id", eventId);

    if (error) {
      console.error("Failed to delete event (admin):", error);
      return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete event:", error);
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}