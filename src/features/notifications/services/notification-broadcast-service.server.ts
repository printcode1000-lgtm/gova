import 'server-only';

import { createHash } from 'node:crypto';
import { isSuperAdminIdentity } from '@/features/auth/utils/super-admin';
import type {
  BroadcastNotificationInput,
  BroadcastNotificationResult,
  BroadcastRecipientsResult,
} from '../domain/entities';
import { ListBroadcastRecipientsQuery } from '@/modules/data-access/domains/notifications/operations/queries/list-broadcast-recipients.query';
import { NotificationGrantCollector } from './notification-grant-collector.server';

export class NotificationBroadcastService {
  constructor(
    private readonly listRecipientsQuery = new ListBroadcastRecipientsQuery(),
  ) {}

  async listRecipients(identity: { uid: string; phone: string }): Promise<BroadcastRecipientsResult> {
    this.assertAdmin(identity);
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
    this.assertAdmin(input.identity);
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
    // The main app authorises the broadcast; it does not deliver it. The admin's
    // browser carries the grant to the notifications service, so the reported
    // result is what was granted, not what a provider accepted.
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

  private assertAdmin(identity: { uid: string; phone: string }) {
    if (!isSuperAdminIdentity(identity.uid, identity.phone)) throw new Error('forbidden');
  }
}
