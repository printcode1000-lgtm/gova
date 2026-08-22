import "server-only";

import { randomUUID } from "node:crypto";

import type {
  SelfTestNotificationInput,
  SelfTestNotificationResult,
} from "@asol/notifications-core";
import {
  SELF_TEST_NOTIFICATION_DELIVERY,
  SELF_TEST_NOTIFICATION_SOURCE,
  selfTestNotificationContent,
} from "@asol/notifications-core";
import { GetNotificationUserIdentityQuery } from "@asol/data-core/notifications";

import { NotificationGrantCollector } from "./notification-grant-collector.server";

/**
 * The account's own delivery test.
 *
 * Deliberately not part of the broadcast service: that one authorises an
 * administrator to reach other people, and every check in it exists for that.
 * This one reaches exactly one uid — the caller's — and its content is fixed in
 * `@asol/notifications-core`, so a signed-in user cannot turn it into a way to
 * push arbitrary text to themselves or to anyone else.
 *
 * Like the broadcast, the main app only authorises: it signs a grant, and the
 * caller's own client hands that grant to the notifications service, which
 * looks up the account's tokens and delivers.
 */
export class NotificationSelfTestService {
  constructor(
    private readonly users = new GetNotificationUserIdentityQuery(),
  ) {}

  async send(
    input: SelfTestNotificationInput,
  ): Promise<SelfTestNotificationResult> {
    const uid =
      typeof input?.identity?.uid === "string" ? input.identity.uid.trim() : "";
    const phone =
      typeof input?.identity?.phone === "string"
        ? input.identity.phone.trim()
        : "";
    const user = await this.users.execute(uid);
    if (!user || !phone || user.phone !== phone) throw new Error("forbidden");

    const content = selfTestNotificationContent(input?.locale);
    const requestId =
      typeof input?.requestId === "string" && input.requestId.trim()
        ? input.requestId.trim()
        : randomUUID();
    const dedupeKey = `notification-self-test:${requestId.slice(0, 100)}`;

    const grants = new NotificationGrantCollector(user.uid);
    const issued = grants.issue({
      actorUid: user.uid,
      uids: [user.uid],
      title: content.title,
      body: content.body,
      dedupeKey,
      category: SELF_TEST_NOTIFICATION_DELIVERY.category,
      priority: SELF_TEST_NOTIFICATION_DELIVERY.priority,
      sound: SELF_TEST_NOTIFICATION_DELIVERY.sound,
      route: { href: SELF_TEST_NOTIFICATION_DELIVERY.routeHref },
      metadata: {
        source: SELF_TEST_NOTIFICATION_SOURCE,
        notificationSelfTest: true,
        requestId,
      },
    });
    if (!issued) throw new Error("notificationGrantNotIssued");

    return {
      requested: 1,
      results: [{ uid: user.uid, tokenCount: 0, status: "granted" as const }],
      notificationGrants: grants.toArray(),
      channelId: SELF_TEST_NOTIFICATION_DELIVERY.channelId,
      dedupeKey,
    };
  }
}

export const notificationSelfTestService = new NotificationSelfTestService();
