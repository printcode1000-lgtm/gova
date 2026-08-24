import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import type {
  BroadcastNotificationInput,
  BroadcastNotificationResult,
  BroadcastRecipientsResult,
  NotificationTestInput,
  NotificationTestResult,
} from '@asol/notifications-core';
import { getNotificationTestScenario } from '@asol/notifications-core';
import { ListBroadcastRecipientsQuery } from '@asol/data-core/notifications';
import { assertNotificationAdmin } from '../notification-admin-authorization';
import { NotificationGrantCollector } from './notification-grant-collector.server';

export class NotificationBroadcastService {
  constructor(
    private readonly listRecipientsQuery = new ListBroadcastRecipientsQuery(),
  ) {}

  async listRecipients(identity: { uid: string; phone: string }): Promise<BroadcastRecipientsResult> {
    assertNotificationAdmin(identity);
    const recipients = await this.listRecipientsQuery.execute();
    const providerCounts: Record<string, number> = {};
    const platformCounts: Record<string, number> = {};
    for (const recipient of recipients) {
      for (const provider of recipient.providers) {
        providerCounts[provider] = (providerCounts[provider] ?? 0) + 1;
      }
      for (const platform of recipient.platforms) {
        platformCounts[platform] = (platformCounts[platform] ?? 0) + 1;
      }
    }
    return {
      userCount: recipients.length,
      tokenCount: recipients.reduce((sum, recipient) => sum + recipient.tokenCount, 0),
      providerCounts,
      platformCounts,
      recipients,
    };
  }

  async send(input: BroadcastNotificationInput): Promise<BroadcastNotificationResult> {
    assertNotificationAdmin(input.identity);
    const title = input.title.trim();
    const body = input.body.trim();
    if (!title || !body) throw new Error('notificationContentRequired');
    const recipients = await this.listRecipientsQuery.execute();
    const allowed = new Set(recipients.map((recipient) => recipient.uid));
    const requested = input.sendToAll
      ? [...allowed]
      : (input.uids ?? []).map((uid) => uid.trim()).filter((uid) => allowed.has(uid));
    const uids = Array.from(new Set(requested));
    if (uids.length === 0) throw new Error('notificationRecipientsRequired');
    const audienceKey = input.sendToAll ? 'all' : uids.slice().sort().join(',');
    const dedupeHash = createHash('sha256')
      .update(JSON.stringify({ title, body, audienceKey }))
      .digest('hex')
      .slice(0, 24);
    const grants = new NotificationGrantCollector(input.identity.uid);
    const issued = grants.issue({
      actorUid: input.identity.uid,
      uids,
      title,
      body,
      dedupeKey: `broadcast:${dedupeHash}`,
      metadata: {
        href: '/notifications',
        source: 'super_admin_broadcast',
        requestId: input.requestId ?? '',
      },
    });
    if (!issued) throw new Error('notificationGrantNotIssued');
    return {
      requested: uids.length,
      results: uids.map((uid) => ({ uid, tokenCount: 0, status: 'granted' as const })),
      recipientMode: input.sendToAll ? 'all' : 'selected',
      notificationGrants: grants.toArray(),
    };
  }

  async sendTest(input: NotificationTestInput): Promise<NotificationTestResult> {
    assertNotificationAdmin(input.identity);
    const scenario = getNotificationTestScenario(input.scenarioId);
    if (!scenario) throw new Error('notificationTestScenarioInvalid');

    const title = input.title.trim();
    const body = input.body.trim();
    if (!title || !body) throw new Error('notificationContentRequired');
    if (title.length > 120 || body.length > 1_000) throw new Error('notificationContentTooLong');

    const routeHref = input.routeHref?.trim() || '/notifications';
    if (!routeHref.startsWith('/') || routeHref.startsWith('//') || routeHref.length > 500) {
      throw new Error('notificationRouteInvalid');
    }

    const requestId = input.requestId?.trim() || randomUUID();
    const dedupeKey = `notification-test:${requestId.slice(0, 100)}`;
    const grants = new NotificationGrantCollector(input.identity.uid);
    const issued = grants.issue({
      actorUid: input.identity.uid,
      uids: [input.identity.uid],
      title,
      body,
      dedupeKey,
      category: scenario.category,
      priority: scenario.priority,
      sound: scenario.sound,
      route: { href: routeHref },
      metadata: {
        source: scenario.source,
        notificationTest: true,
        notificationTestScenario: scenario.id,
        requestId,
      },
    });
    if (!issued) throw new Error('notificationGrantNotIssued');

    return {
      requested: 1,
      results: [{ uid: input.identity.uid, tokenCount: 0, status: 'granted' as const }],
      notificationGrants: grants.toArray(),
      scenarioId: scenario.id,
      channelId: scenario.channelId,
      dedupeKey,
    };
  }
}
