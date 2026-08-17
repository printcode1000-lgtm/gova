/**
 * Notifications — the microservice entry point.
 *
 * Imported by `services/notifications` and by nothing else. That deployment is
 * built by mirroring the files reachable from a small set of entry points
 * (`scripts/sync-notifications-service-sources.ts`), so its import surface is
 * also its *deployment* surface: a path that reaches the users repository puts
 * the users repository on an account that must never hold it.
 *
 * It therefore exports exactly two things — verify a grant, deliver a grant —
 * and deliberately not `server.ts`, whose broadcast and token services reach the
 * users database.
 *
 * No `server-only` import: this file is compiled inside the microservice's own
 * Next application, which has no such module.
 */

import type { SendNotificationToUsersResult } from "./domain/entities";
import { verifyNotificationGrant } from "./services/notification-grant.server";
import { NotificationSendService } from "./services/notification-send-service.server";

/** One sender for the process. Provider clients are pooled inside it. */
const sendService = new NotificationSendService();

export interface GrantDeliveryOutcome {
  accepted: number;
  rejected: number;
  results: Array<SendNotificationToUsersResult | { error: string }>;
}

/** How many grants one browser request may carry. Caps work per call. */
export const MAX_GRANTS_PER_REQUEST = 100;

/**
 * Verify and fan out a batch of signed grants.
 *
 * Each grant is independent: an expired or forged entry fails on its own and the
 * rest still deliver, which is what lets a browser carry several grants from one
 * API response without one stale entry losing the others.
 *
 * Errors are reduced to their message — never a provider response body, which
 * can carry a credential — and reported per grant rather than thrown, because a
 * spent grant cannot be retried by the caller anyway.
 */
export async function deliverNotificationGrants(
  grants: readonly string[],
): Promise<GrantDeliveryOutcome> {
  const results: GrantDeliveryOutcome["results"] = [];
  let accepted = 0;
  let rejected = 0;

  for (const grant of grants.slice(0, MAX_GRANTS_PER_REQUEST)) {
    let payload;
    try {
      payload = verifyNotificationGrant(grant);
    } catch (error) {
      rejected += 1;
      results.push({
        error: error instanceof Error ? error.message : "notificationGrantInvalid",
      });
      continue;
    }

    try {
      results.push(await sendService.sendToUsersLocally(payload.send));
      accepted += 1;
    } catch (error) {
      rejected += 1;
      results.push({
        error: error instanceof Error ? error.message : "notificationSendFailed",
      });
    }
  }

  return { accepted, rejected, results };
}

/** Read the grant list out of a request body, ignoring anything else in it. */
export function readGrantsFromRequestBody(body: unknown): string[] {
  if (!body || typeof body !== "object") return [];
  const candidate = body as { grant?: unknown; grants?: unknown };
  const values = [
    ...(typeof candidate.grant === "string" ? [candidate.grant] : []),
    ...(Array.isArray(candidate.grants) ? candidate.grants : []),
  ];
  return values.filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
}
