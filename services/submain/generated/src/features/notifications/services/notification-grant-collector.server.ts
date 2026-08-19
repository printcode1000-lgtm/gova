import "server-only";

import type { SendNotificationToUsersInput } from "@asol/notifications-core";
import { createNotificationGrant } from "@asol/notifications-core/server";

/**
 * Collects the notification grants a Business API route wants to hand back.
 *
 * Routes used to call `sendToUsers` here. They no longer send anything: the main
 * app has no path to the notifications service. It decides what *should* be
 * sent — the part only it can decide, since it owns the users and orders
 * data — signs that decision, and returns it. The browser carries it across.
 *
 * `issue` never throws. A route's job is the order, not the notification, and a
 * grant that could not be signed must not fail the operation that earned it.
 * The caller logs; the collector stays quiet and simply yields fewer grants.
 */
export class NotificationGrantCollector {
  private readonly grants: string[] = [];

  constructor(private readonly actorUid: string | null = null) {}

  issue(send: SendNotificationToUsersInput): boolean {
    try {
      this.grants.push(createNotificationGrant(send, { actorUid: this.actorUid }));
      return true;
    } catch {
      return false;
    }
  }

  get size(): number {
    return this.grants.length;
  }

  toArray(): string[] {
    return [...this.grants];
  }
}
