import "server-only";

import { signEnvelope, verifyEnvelope } from "@asol/signed-token-core";

import { getNotificationGrantSecret } from "@/core/config/server-env/server-env.values.turso-env";
import type { SendNotificationToUsersInput } from "../domain/entities";

/**
 * A pre-authorised notification, signed by the main app and carried by the
 * browser to the notifications service.
 *
 * The two deployments never call each other. The main app decides *what* may be
 * sent and to *whom* — it is the only side that can, since it owns the users
 * and orders databases — then signs that decision. The service verifies the
 * signature and sends exactly what is inside.
 *
 * The whole payload is signed, not just the recipients. That is deliberate: the
 * browser is a courier, not a participant. It cannot add a uid, change the
 * template, or rewrite the body, because any edit invalidates the signature.
 *
 * Grants are short-lived. They authorise one send that the server already
 * decided should happen, so an hour of replay window buys nothing and only
 * widens the blast radius of a leaked response.
 */

export const NOTIFICATION_GRANT_TTL_MS = 5 * 60 * 1000;

export interface NotificationGrantPayload {
  /** Schema version, so the service can reject shapes it does not understand. */
  v: 1;
  /** Who the main app was acting for when it issued this. Audit only. */
  actorUid: string | null;
  /** The exact send the service will perform. */
  send: SendNotificationToUsersInput;
  issuedAt: number;
  expiresAt: number;
}

/**
 * Signing itself is `@asol/signed-token-core`. This module keeps what a *grant* is: the schema
 * version the service will accept, the send it authorises, and the five-minute window.
 */
const ENVELOPE = {
  secret: getNotificationGrantSecret,
  invalidError: "notificationGrantInvalid",
  expiredError: "notificationGrantExpired",
};

export function createNotificationGrant(
  send: SendNotificationToUsersInput,
  options: { actorUid?: string | null; ttlMs?: number } = {},
): string {
  if (!Array.isArray(send.uids) || send.uids.length === 0) {
    throw new Error("notificationGrantRecipientsRequired");
  }
  if (!send.dedupeKey) throw new Error("notificationGrantDedupeKeyRequired");

  return signEnvelope<NotificationGrantPayload>(
    { v: 1, actorUid: options.actorUid ?? null, send, issuedAt: Date.now() },
    { ...ENVELOPE, ttlMs: options.ttlMs ?? NOTIFICATION_GRANT_TTL_MS },
  );
}

export function verifyNotificationGrant(token: string): NotificationGrantPayload {
  const payload = verifyEnvelope<NotificationGrantPayload>(token, {
    ...ENVELOPE,
    // The version check runs before the shape check so an older grant reports what is actually
    // wrong with it rather than looking forged.
    validate: (value) => {
      if (value.v !== 1) throw new Error("notificationGrantUnsupportedVersion");
      return (
        Boolean(value.send) &&
        Array.isArray(value.send.uids) &&
        value.send.uids.length > 0 &&
        Boolean(value.send.dedupeKey)
      );
    },
  });
  return payload;
}
