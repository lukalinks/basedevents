import { NextRequest, NextResponse } from "next/server";
import { addEventComment, getEventComments } from "../../../../lib/events";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");
    
    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }
    
    const comments = await getEventComments(eventId);
    return NextResponse.json({ comments });
  } catch (error) {
    console.error("Failed to fetch comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, author, content } = body;
    
    if (!eventId || !author || !content) {
      return NextResponse.json(
        { error: "Event ID, author, and content are required" },
        { status: 400 }
      );
    }
    
    await addEventComment(eventId, author, content);
    return NextResponse.json({ success: true, message: "Comment added" });
  } catch (error) {
    console.error("Failed to add comment:", error);
    return NextResponse.json(
      { error: "Failed to add comment" },
      { status: 500 }
    );
  }
}