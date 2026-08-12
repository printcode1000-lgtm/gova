import { notificationsDataSource, usersDataSource } from "@/modules/data-access/core";
import 'server-only';

import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { IDatabaseClient } from '@/modules/data-access/core/database/database-client.interface';
import { users } from '@/modules/data-access/core/database/schema';
import { userNotificationTokens } from '@/modules/data-access/core/database/notifications/notifications.schema';
import type {
  BroadcastRecipient,
  NotificationPlatform,
} from '@/features/notifications/contracts';

interface RecipientAccumulator {
  uid: string;
  tokenCount: number;
  platforms: Set<NotificationPlatform>;
  providers: Set<string>;
  lastSeenAt?: string;
}

/** libSQL caps bound parameters per statement; uid lookups are chunked to stay under it. */
const UID_LOOKUP_CHUNK_SIZE = 400;

/**
 * Resolves the broadcast audience across two databases.
 *
 * Tokens live in the notifications database and identities in the users
 * database — on different Turso accounts — so this cannot be a JOIN. Tokens are
 * read first because they are the narrower side: only uids that actually own an
 * enabled token are looked up in `users`, and a uid whose account is missing or
 * soft-deleted is dropped, which is exactly what the old `innerJoin` did.
 */
export class BroadcastRecipientRepository {
  constructor(
    private readonly notifications: IDatabaseClient = notificationsDataSource,
    private readonly usersDatabase: IDatabaseClient = usersDataSource,
  ) {}

  async listReceivers(): Promise<BroadcastRecipient[]> {
    const tokenRows = await this.notifications.db
      .select({
        uid: userNotificationTokens.uid,
        platform: userNotificationTokens.platform,
        provider: userNotificationTokens.provider,
        lastSeenAt: userNotificationTokens.lastSeenAt,
      })
      .from(userNotificationTokens)
      .where(
        and(
          eq(userNotificationTokens.enabled, true),
          isNull(userNotificationTokens.deletedAt),
        ),
      );

    const grouped = new Map<string, RecipientAccumulator>();
    for (const row of tokenRows) {
      const current =
        grouped.get(row.uid) ??
        {
          uid: row.uid,
          tokenCount: 0,
          platforms: new Set<NotificationPlatform>(),
          providers: new Set<string>(),
          lastSeenAt: undefined,
        };
      current.tokenCount += 1;
      current.platforms.add(row.platform);
      current.providers.add(row.provider);
      if (!current.lastSeenAt || String(row.lastSeenAt ?? '') > current.lastSeenAt) {
        current.lastSeenAt = row.lastSeenAt ?? undefined;
      }
      grouped.set(row.uid, current);
    }

    if (grouped.size === 0) return [];

    const identities = await this.loadIdentities([...grouped.keys()]);

    return [...grouped.values()]
      .flatMap((item) => {
        const identity = identities.get(item.uid);
        if (!identity) return [];
        return [
          {
            uid: item.uid,
            phoneMasked: maskPhone(identity.phone),
            emailMasked: identity.email ? maskEmail(identity.email) : undefined,
            tokenCount: item.tokenCount,
            platforms: [...item.platforms],
            providers: [...item.providers],
            lastSeenAt: item.lastSeenAt,
          },
        ];
      })
      .sort((a, b) => b.tokenCount - a.tokenCount || a.uid.localeCompare(b.uid));
  }

  private async loadIdentities(
    uids: string[],
  ): Promise<Map<string, { phone: string; email: string | null }>> {
    const identities = new Map<string, { phone: string; email: string | null }>();

    for (let index = 0; index < uids.length; index += UID_LOOKUP_CHUNK_SIZE) {
      const chunk = uids.slice(index, index + UID_LOOKUP_CHUNK_SIZE);
      const rows = await this.usersDatabase.db
        .select({ uid: users.uid, phone: users.phone, email: users.email })
        .from(users)
        .where(and(inArray(users.uid, chunk), isNull(users.deletedAt)));
      for (const row of rows) {
        identities.set(row.uid, { phone: row.phone, email: row.email });
      }
    }

    return identities;
  }
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 5) return '*****';
  return `${digits.slice(0, 3)}****${digits.slice(-3)}`;
}

function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!name || !domain) return '***';
  return `${name.slice(0, 2)}***@${domain}`;
}

export const broadcastRecipientRepository = new BroadcastRecipientRepository();
