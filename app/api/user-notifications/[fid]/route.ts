import { getUserNotificationDetails } from "@/lib/notification";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fid: string }> }
) {
  const resolvedParams = await params;
  try {
    const fid = parseInt(resolvedParams.fid);
    
    if (isNaN(fid)) {
      return NextResponse.json(
        { error: "Invalid FID" },
        { status: 400 }
      );
    }

    const notificationDetails = await getUserNotificationDetails(fid);
    
    return NextResponse.json({
      hasNotifications: !!notificationDetails,
      details: notificationDetails
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
