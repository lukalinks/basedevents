import {
  setUserNotificationDetails,
  deleteUserNotificationDetails,
} from "@/lib/notification";
import { sendFrameNotification } from "@/lib/notification-client";
import { http } from "viem";
import { createPublicClient } from "viem";
import { optimism } from "viem/chains";
import {
  parseWebhookEvent,
  verifyAppKeyWithNeynar,
} from "@farcaster/miniapp-node";

const appName = process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME;

// Note: Using @farcaster/miniapp-node for proper signature verification
// The old manual verification functions have been replaced with the official library

export async function POST(request: Request) {
  try {
    const requestJson = await request.json();

    // Use proper Farcaster signature verification
    const data = await parseWebhookEvent(requestJson, verifyAppKeyWithNeynar);
    
    const { fid } = data;
    const event = data as any; // Type assertion for now

  switch (event.event) {
    case "miniapp_added":
      console.log(
        "miniapp_added",
        "event.notificationDetails",
        event.notificationDetails,
      );
      if (event.notificationDetails) {
        await setUserNotificationDetails(fid, event.notificationDetails);
        await sendFrameNotification({
          fid,
          title: `Welcome to ${appName}`,
          body: `Thank you for adding ${appName}`,
          notificationDetails: event.notificationDetails,
        });
      } else {
        await deleteUserNotificationDetails(fid);
      }

      break;
    case "miniapp_removed": {
      console.log("miniapp_removed");
      await deleteUserNotificationDetails(fid);
      break;
    }
    case "notifications_enabled": {
      console.log("notifications_enabled", event.notificationDetails);
      await setUserNotificationDetails(fid, event.notificationDetails);
      await sendFrameNotification({
        fid,
        title: `Welcome to ${appName}`,
        body: `Thank you for enabling notifications for ${appName}`,
        notificationDetails: event.notificationDetails,
      });

      break;
    }
    case "notifications_disabled": {
      console.log("notifications_disabled");
      await deleteUserNotificationDetails(fid);

      break;
    }
  }

  return Response.json({ success: true });
  
  } catch (error: unknown) {
    console.error('Webhook verification failed:', error);
    
    // Handle different types of verification errors
    if (error && typeof error === 'object' && 'name' in error) {
      const errorName = (error as any).name;
      
      switch (errorName) {
        case "VerifyJsonFarcasterSignature.InvalidDataError":
        case "VerifyJsonFarcasterSignature.InvalidEventDataError":
          return Response.json(
            { success: false, error: "Invalid request data" },
            { status: 400 }
          );
        case "VerifyJsonFarcasterSignature.InvalidAppKeyError":
          return Response.json(
            { success: false, error: "Invalid app key" },
            { status: 401 }
          );
        case "VerifyJsonFarcasterSignature.VerifyAppKeyError":
          return Response.json(
            { success: false, error: "App key verification failed" },
            { status: 500 }
          );
        default:
          return Response.json(
            { success: false, error: "Verification failed" },
            { status: 400 }
          );
      }
    }
    
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
