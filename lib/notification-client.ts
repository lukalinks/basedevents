import {
  MiniAppNotificationDetails,
  type SendNotificationRequest,
  sendNotificationResponseSchema,
} from "@farcaster/frame-sdk";
import { getUserNotificationDetails, deleteUserNotificationDetails } from "@/lib/notification";

const appUrl = process.env.NEXT_PUBLIC_URL || "";
if (!appUrl) {
  console.warn("NEXT_PUBLIC_URL is not set. Notifications will use an empty targetUrl.");
}

type SendFrameNotificationResult =
  | {
      state: "error";
      error: unknown;
    }
  | { state: "no_token" }
  | { state: "rate_limit" }
  | { state: "success" };

export async function sendFrameNotification({
  fid,
  title,
  body,
  notificationDetails,
}: {
  fid: number;
  title: string;
  body: string;
  notificationDetails?: MiniAppNotificationDetails | null;
}): Promise<SendFrameNotificationResult> {
  if (!notificationDetails) {
    notificationDetails = await getUserNotificationDetails(fid);
  }
  if (!notificationDetails) {
    return { state: "no_token" };
  }

  // Validate payload constraints according to Farcaster guidelines
  const validatedTitle = title.length > 32 ? title.substring(0, 29) + '...' : title;
  const validatedBody = body.length > 128 ? body.substring(0, 125) + '...' : body;
  const validatedTargetUrl = appUrl.length > 1024 ? appUrl.substring(0, 1021) + '...' : appUrl;

  // Generate stable notification ID (max 128 chars)
  const notificationId = `event-${Date.now()}-${fid}`.substring(0, 128);

  const response = await fetch(notificationDetails.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      notificationId,
      title: validatedTitle,
      body: validatedBody,
      targetUrl: validatedTargetUrl,
      tokens: [notificationDetails.token],
    } satisfies SendNotificationRequest),
  });

  const responseJson = await response.json();

  if (response.status === 200) {
    const responseBody = sendNotificationResponseSchema.safeParse(responseJson);
    if (responseBody.success === false) {
      return { state: "error", error: responseBody.error.errors };
    }

    const { successfulTokens, invalidTokens, rateLimitedTokens } = responseBody.data.result;
    
    // Handle invalid tokens (user disabled notifications)
    if (invalidTokens.length > 0) {
      console.log(`Invalid tokens detected for FID ${fid}, cleaning up`);
      // Clean up invalid tokens from storage
      await deleteUserNotificationDetails(fid);
      return { state: "no_token" };
    }

    // Handle rate limited tokens
    if (rateLimitedTokens.length > 0) {
      console.log(`Rate limited for FID ${fid}, will retry later`);
      return { state: "rate_limit" };
    }

    // Success
    if (successfulTokens.length > 0) {
      console.log(`Notification sent successfully to FID ${fid}`);
      return { state: "success" };
    }

    return { state: "error", error: "No tokens processed" };
  }
  
  console.error("Notification send failed", {
    status: response.status,
    url: notificationDetails.url,
    response: responseJson,
  });
  return { state: "error", error: responseJson };
}
