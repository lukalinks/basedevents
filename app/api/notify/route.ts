import { sendFrameNotification } from "@/lib/notification-client";
import { getAddressFid } from "@/lib/farcaster";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { fid, creatorAddress, notification } = body as {
      fid?: number;
      creatorAddress?: string;
      notification: { title: string; body: string; notificationDetails?: any };
    };

    if (!fid && creatorAddress) {
      fid = await getAddressFid(creatorAddress) as number | undefined;
    }

    if (!fid) {
      return NextResponse.json({ state: "no_token" }, { status: 200 });
    }

    const result = await sendFrameNotification({
      fid,
      title: notification.title,
      body: notification.body,
      notificationDetails: notification.notificationDetails,
    });

    if (result.state === "error") {
      return NextResponse.json(
        { error: result.error },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, state: result.state }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}
