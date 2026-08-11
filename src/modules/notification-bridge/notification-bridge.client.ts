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
 * Ordinary business notifications use the fire-and-forget entry point so push
 * cannot turn a successful order into a failed one. Conversation actions call
 * `deliverNotificationGrants` directly and await its recipient outcomes,
 * because their visible success state is the delivery itself.
 */

const SEND_PATH = "/api/notifications/send";

/** Grants expire in minutes; a slow hop is worth abandoning, not queueing. */
const TIMEOUT_MS = 10_000;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export interface NotificationBridgeResult {
  attempted: number;
  /** Recipients with at least one sent, queued, or partially sent transport. */
  delivered: number;
  /** Recipients with no token or only failed transports. */
  unavailable: number;
}

interface NotificationServiceResponse {
  accepted?: number;
  results?: Array<{
    results?: Array<{ status?: string }>;
  } | { error?: string }>;
}

/** Convert the notifications service response into honest recipient counts. */
export function summarizeNotificationSendResponse(
  body: unknown,
): Pick<NotificationBridgeResult, "delivered" | "unavailable"> {
  const response = body as NotificationServiceResponse | null;
  const recipients = Array.isArray(response?.results)
    ? response.results.flatMap((result) =>
        "results" in result && Array.isArray(result.results)
          ? result.results
          : [],
      )
    : [];
  const delivered = recipients.filter((recipient) =>
    ["sent", "queued", "partial"].includes(String(recipient.status ?? "")),
  ).length;
  return {
    delivered,
    unavailable: Math.max(0, recipients.length - delivered),
  };
}

/**
 * Delivers one grant. Resolves either way — callers treat this as best effort.
 */
async function deliverGrant(
  baseUrl: string,
  grant: string,
): Promise<Pick<NotificationBridgeResult, "delivered" | "unavailable">> {
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
    if (!response.ok) return { delivered: 0, unavailable: 1 };
    return summarizeNotificationSendResponse(await response.json());
  } catch {
    return { delivered: 0, unavailable: 1 };
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
  if (!isBrowser()) return { attempted: 0, delivered: 0, unavailable: 0 };

  const grants = readNotificationGrants(body);
  if (grants.length === 0) {
    return { attempted: 0, delivered: 0, unavailable: 0 };
  }

  const baseUrl = getNotificationsPublicUrl();
  if (!baseUrl) {
    return { attempted: grants.length, delivered: 0, unavailable: grants.length };
  }

  const results = await Promise.all(
    grants.map((grant) => deliverGrant(baseUrl, grant)),
  );
  return {
    attempted: grants.length,
    delivered: results.reduce((total, result) => total + result.delivered, 0),
    unavailable: results.reduce(
      (total, result) => total + result.unavailable,
      0,
    ),
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
