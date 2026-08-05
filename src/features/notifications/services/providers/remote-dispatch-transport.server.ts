import "server-only";

import {
  getNotificationInternalSecret,
  getNotificationsServiceUrl,
} from "@/core/config/server-env";
import type {
  SendNotificationToUsersInput,
  SendNotificationToUsersResult,
} from "../../domain/entities";

/**
 * Forwards a send to the notifications deployment on its own Vercel account.
 *
 * Push fan-out is one provider request per token, so on the main app it holds a
 * serverless function open for the whole burst — billed by wall clock. Moving
 * it here is the point of the account split: the main app pays for one HTTP
 * round trip and the fan-out is billed to the notifications account.
 *
 * `isConfigured()` is false when `ASOL_NOTIFICATIONS_SERVICE_URL` is unset,
 * which is the correct state for local development and for the notifications
 * deployment itself.
 */
export class RemoteDispatchTransport {
  /** Generous: covers the receiving side resolving tokens before it answers. */
  private static readonly TIMEOUT_MS = 20_000;

  isConfigured(): boolean {
    return getNotificationsServiceUrl() !== null;
  }

  async send(
    input: SendNotificationToUsersInput,
  ): Promise<SendNotificationToUsersResult> {
    const baseUrl = getNotificationsServiceUrl();
    if (!baseUrl) throw new Error("notificationsServiceUrlNotConfigured");

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      RemoteDispatchTransport.TIMEOUT_MS,
    );

    try {
      const response = await fetch(`${baseUrl}/api/notifications/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getNotificationInternalSecret()}`,
        },
        body: JSON.stringify(input),
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        // The body may carry a provider error; the status is what callers can act on.
        throw new Error(`notificationsServiceRejected:${response.status}`);
      }

      return (await response.json()) as SendNotificationToUsersResult;
    } finally {
      clearTimeout(timeout);
    }
  }
}
