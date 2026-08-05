/**
 * How a signed notification grant travels from the main app to the browser.
 *
 * Client-safe by design: this file carries no secret and no signing code, only
 * the shape both sides agree on. Any Business API response may include grants;
 * the browser bridge picks them up wherever they appear and delivers them to
 * the notifications service.
 *
 * See `src/modules/notification-bridge` for the browser half.
 */

export const NOTIFICATION_GRANTS_KEY = "notificationGrants";

export interface NotificationGrantCarrier {
  /** Signed, short-lived, one send each. Opaque to the browser. */
  notificationGrants?: string[];
}

/** Adds grants to an API response body, omitting the key when there are none. */
export function withNotificationGrants<T extends object>(
  body: T,
  grants: string[],
): T & NotificationGrantCarrier {
  if (grants.length === 0) return body;
  return { ...body, [NOTIFICATION_GRANTS_KEY]: grants };
}

/** Reads grants out of an arbitrary API response body. */
export function readNotificationGrants(body: unknown): string[] {
  if (!body || typeof body !== "object") return [];
  const value = (body as NotificationGrantCarrier)[NOTIFICATION_GRANTS_KEY];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}
