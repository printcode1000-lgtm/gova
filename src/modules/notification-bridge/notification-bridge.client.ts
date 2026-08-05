import { readNotificationGrants } from "@/features/notifications/domain/notification-grant-envelope";
import { getNotificationsPublicUrl } from "@/core/config/public-env";

/**
 * The bridge between the two deployments. It runs in the browser and nowhere
 * else.
 *
 * Neither backend knows the other exists: the main app has no code path to the
 * notifications service, and the service has no code path back. What connects
 * them is this module — it takes the signed grants a Business API response
 * carries and delivers them to the notifications service.
 *
 * It is deliberately fire-and-forget. The main app's response has already been
 * handed to the caller by the time delivery is attempted, so a failure here
 * must never turn a successful order into a failed one. The consequence is
 * stated plainly rather than hidden: delivery is best effort, and a browser
 * that closes before the hop completes sends nothing.
 */

const SEND_PATH = "/api/notifications/send";

/** Grants expire in minutes; a slow hop is worth abandoning, not queueing. */
const TIMEOUT_MS = 10_000;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export interface NotificationBridgeResult {
  attempted: number;
  delivered: number;
}

/**
 * Delivers one grant. Resolves either way — callers treat this as best effort.
 */
async function deliverGrant(baseUrl: string, grant: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}${SEND_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // The grant is the whole request: it already carries recipients, template,
      // and text, all signed. Nothing here can widen what it authorises.
      body: JSON.stringify({ grant }),
      signal: controller.signal,
      cache: "no-store",
      // No cookies or credentials: the grant is the only authority.
      credentials: "omit",
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Delivers every grant found in an API response body.
 *
 * Safe to call with any body — one that carries no grants is a no-op, which is
 * what lets the API transport call it unconditionally.
 */
export async function deliverNotificationGrants(
  body: unknown,
): Promise<NotificationBridgeResult> {
  if (!isBrowser()) return { attempted: 0, delivered: 0 };

  const grants = readNotificationGrants(body);
  if (grants.length === 0) return { attempted: 0, delivered: 0 };

  const baseUrl = getNotificationsPublicUrl();
  if (!baseUrl) return { attempted: grants.length, delivered: 0 };

  const results = await Promise.all(
    grants.map((grant) => deliverGrant(baseUrl, grant)),
  );
  return {
    attempted: grants.length,
    delivered: results.filter(Boolean).length,
  };
}

/**
 * Fire-and-forget entry point for the API transport.
 *
 * Returns nothing and never rejects: the response has already been delivered to
 * the caller, and a push that failed to leave the browser must not surface as a
 * failed API call.
 */
export function scheduleNotificationGrantDelivery(body: unknown): void {
  if (!isBrowser()) return;
  if (readNotificationGrants(body).length === 0) return;

  void deliverNotificationGrants(body).then(
    (result) => {
      if (result.delivered < result.attempted) {
        // Visible rather than silent: this is the one place a notification can
        // be lost without any server ever knowing. Console output is picked up
        // by the client log pipeline, so it reaches the same place as other
        // client faults — importing the log service directly would create a
        // cycle, since the API client imports this module.
        console.warn(
          `[Asol][NotificationBridge] delivered ${result.delivered}/${result.attempted} grants`,
        );
      }
    },
    (error: unknown) => {
      console.warn(
        "[Asol][NotificationBridge] grant delivery failed",
        error instanceof Error ? error.message : error,
      );
    },
  );
}
