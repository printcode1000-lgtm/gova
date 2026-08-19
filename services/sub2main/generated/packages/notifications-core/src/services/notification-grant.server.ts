import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
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

function signature(value: string): string {
  return createHmac("sha256", getNotificationGrantSecret())
    .update(value)
    .digest("base64url");
}

export function createNotificationGrant(
  send: SendNotificationToUsersInput,
  options: { actorUid?: string | null; ttlMs?: number } = {},
): string {
  if (!Array.isArray(send.uids) || send.uids.length === 0) {
    throw new Error("notificationGrantRecipientsRequired");
  }
  if (!send.dedupeKey) throw new Error("notificationGrantDedupeKeyRequired");

  const now = Date.now();
  const payload: NotificationGrantPayload = {
    v: 1,
    actorUid: options.actorUid ?? null,
    send,
    issuedAt: now,
    expiresAt: now + (options.ttlMs ?? NOTIFICATION_GRANT_TTL_MS),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded)}`;
}

export function verifyNotificationGrant(token: string): NotificationGrantPayload {
  const [encoded, candidate] = typeof token === "string" ? token.split(".") : [];
  if (!encoded || !candidate) throw new Error("notificationGrantInvalid");

  const expected = signature(encoded);
  if (
    candidate.length !== expected.length ||
    !timingSafeEqual(Buffer.from(candidate), Buffer.from(expected))
  ) {
    throw new Error("notificationGrantInvalid");
  }

  let payload: NotificationGrantPayload;
  try {
    payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as NotificationGrantPayload;
  } catch {
    throw new Error("notificationGrantInvalid");
  }

  if (payload.v !== 1) throw new Error("notificationGrantUnsupportedVersion");
  if (!payload.send || !Array.isArray(payload.send.uids) || payload.send.uids.length === 0) {
    throw new Error("notificationGrantInvalid");
  }
  if (!payload.send.dedupeKey) throw new Error("notificationGrantInvalid");
  if (typeof payload.expiresAt !== "number" || payload.expiresAt <= Date.now()) {
    throw new Error("notificationGrantExpired");
  }

  return payload;
}
