import 'server-only';

import { and, eq, isNull } from 'drizzle-orm';
import { dbClient } from '@/core/database/db-client';
import type { IDatabaseClient } from '@/core/database/database-client.interface';
import { userNotificationTokens, users } from '@/core/database/schema';
import type { BroadcastRecipient } from '../domain/entities';
import type { NotificationPlatform } from '../domain/enums';

interface RecipientAccumulator {
  uid: string;
  phone: string;
  email: string | null;
  tokenCount: number;
  platforms: Set<NotificationPlatform>;
  providers: Set<string>;
  lastSeenAt?: string;
}

export class BroadcastRecipientRepository {
  constructor(private readonly database: IDatabaseClient = dbClient) {}

  async listReceivers(): Promise<BroadcastRecipient[]> {
    const rows = await this.database.db
      .select({
        uid: users.uid,
        phone: users.phone,
        email: users.email,
        platform: userNotificationTokens.platform,
        provider: userNotificationTokens.provider,
        lastSeenAt: userNotificationTokens.lastSeenAt,
      })
      .from(userNotificationTokens)
      .innerJoin(users, eq(users.uid, userNotificationTokens.uid))
      .where(
        and(
          eq(userNotificationTokens.enabled, true),
          isNull(userNotificationTokens.deletedAt),
          isNull(users.deletedAt),
        ),
      );

    const grouped = new Map<string, RecipientAccumulator>();
    for (const row of rows) {
      const current =
        grouped.get(row.uid) ??
        {
          uid: row.uid,
          phone: row.phone,
          email: row.email,
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

    return [...grouped.values()]
      .map((item) => ({
        uid: item.uid,
        phoneMasked: maskPhone(item.phone),
        emailMasked: item.email ? maskEmail(item.email) : undefined,
        tokenCount: item.tokenCount,
        platforms: [...item.platforms],
        providers: [...item.providers],
        lastSeenAt: item.lastSeenAt,
      }))
      .sort((a, b) => b.tokenCount - a.tokenCount || a.uid.localeCompare(b.uid));
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
