import { notificationsDataSource } from "@/modules/data-access/core";
import 'server-only';

import { and, eq, inArray, isNull, ne } from 'drizzle-orm';
import type { IDatabaseClient } from '@/modules/data-access/core/database/database-client.interface';
import {
  userNotificationTokens,
  userNotificationPreferences,
  type NewUserNotificationTokenEntity,
  type UserNotificationTokenEntity,
} from '@/modules/data-access/core/database/notifications/notifications.schema';
import type {
  DeleteNotificationTokenInput,
  RegisteredNotificationToken,
  RegisterNotificationTokenInput,
} from '@/features/notifications/contracts';

function makeTokenId(uid: string, platform: string, deviceId: string): string {
  return `ntok_${uid}_${platform}_${deviceId}`.replace(/[^a-zA-Z0-9_:-]/g, '_');
}

export class UserNotificationTokenRepository {
  constructor(private readonly database: IDatabaseClient = notificationsDataSource) {}

  async upsert(input: RegisterNotificationTokenInput): Promise<RegisteredNotificationToken> {
    const now = new Date().toISOString();
    // Soft-deleted rows keep their primary key and their (uid, device_id,
    // platform) unique index, so a device that was unregistered and registers
    // again must revive its existing row instead of inserting a colliding one.
    const existing = await this.database.db
      .select()
      .from(userNotificationTokens)
      .where(
        and(
          eq(userNotificationTokens.uid, input.uid),
          eq(userNotificationTokens.deviceId, input.deviceId),
          eq(userNotificationTokens.platform, input.platform),
        ),
      )
      .limit(1);

    const id = existing[0]?.id ?? makeTokenId(input.uid, input.platform, input.deviceId);
    const locale = input.locale === 'en' ? 'en' : 'ar';
    await this.releaseTokenValue(input.token, id, now);
    const row: NewUserNotificationTokenEntity = {
      id,
      uid: input.uid,
      platform: input.platform,
      provider: input.provider,
      deviceId: input.deviceId,
      token: input.token,
      locale,
      enabled: true,
      specialtyRequestsEnabled: existing[0]?.specialtyRequestsEnabled ?? true,
      lastSeenAt: now,
      createdAt: existing[0]?.createdAt ?? now,
      updatedAt: now,
      deletedAt: null,
    };

    if (existing[0]) {
      await this.database.db
        .update(userNotificationTokens)
        .set({
          provider: row.provider,
          token: row.token,
          locale,
          enabled: true,
          lastSeenAt: now,
          updatedAt: now,
          deletedAt: null,
        })
        .where(eq(userNotificationTokens.id, id));
    } else {
      await this.database.db.insert(userNotificationTokens).values(row);
    }

    const saved = await this.findById(id);
    if (!saved) throw new Error('notificationTokenSaveFailed');
    return toDomainToken(saved);
  }

  /**
   * A push token addresses exactly one installation. When the same value shows
   * up under a different row — a reinstall that produced a new device id, or a
   * second account on the same handset — the older row is stale and still holds
   * the `token` unique index. Retire it with a tombstone value so the index is
   * free and the audit row survives.
   */
  private async releaseTokenValue(token: string, keepId: string, now: string): Promise<void> {
    const conflicting = await this.database.db
      .select({ id: userNotificationTokens.id })
      .from(userNotificationTokens)
      .where(and(eq(userNotificationTokens.token, token), ne(userNotificationTokens.id, keepId)));
    await Promise.all(
      conflicting.map((row: { id: string }) =>
        this.database.db
          .update(userNotificationTokens)
          .set({
            token: `revoked:${row.id}:${now}`,
            enabled: false,
            deletedAt: now,
            updatedAt: now,
          })
          .where(eq(userNotificationTokens.id, row.id)),
      ),
    );
  }

  async listByUid(uid: string): Promise<RegisteredNotificationToken[]> {
    const rows = await this.database.db
      .select()
      .from(userNotificationTokens)
      .where(
        and(
          eq(userNotificationTokens.uid, uid),
          eq(userNotificationTokens.enabled, true),
          isNull(userNotificationTokens.deletedAt),
        ),
      );
    return rows.map(toDomainToken);
  }

  async listByUids(uids: string[]): Promise<Record<string, RegisteredNotificationToken[]>> {
    const pairs = await Promise.all(uids.map(async (uid) => [uid, await this.listByUid(uid)] as const));
    return Object.fromEntries(pairs);
  }

  async setSpecialtyRequestsEnabled(uid: string, enabled: boolean): Promise<void> {
    const updatedAt = new Date().toISOString();
    await this.database.execute(
      `INSERT INTO user_notification_preferences (uid, specialty_requests_enabled, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(uid) DO UPDATE SET specialty_requests_enabled = excluded.specialty_requests_enabled, updated_at = excluded.updated_at`,
      [uid, enabled ? 1 : 0, updatedAt],
    );
    await this.database.db.update(userNotificationTokens).set({ specialtyRequestsEnabled: enabled, updatedAt }).where(eq(userNotificationTokens.uid, uid));
  }

  async specialtyRequestsEnabled(uid: string): Promise<boolean> {
    const rows = await this.database.db
      .select({ enabled: userNotificationPreferences.specialtyRequestsEnabled })
      .from(userNotificationPreferences)
      .where(eq(userNotificationPreferences.uid, uid))
      .limit(1);
    return rows[0]?.enabled ?? true;
  }

  async filterSpecialtyRequestsEnabled(uids: string[]): Promise<string[]> {
    const unique = Array.from(new Set(uids.filter(Boolean)));
    if (unique.length === 0) return [];
    const rows = await this.database.db
      .select({ uid: userNotificationPreferences.uid, enabled: userNotificationPreferences.specialtyRequestsEnabled })
      .from(userNotificationPreferences)
      .where(inArray(userNotificationPreferences.uid, unique));
    const disabled = new Set(rows.filter((row: { uid: string; enabled: boolean }) => !row.enabled).map((row: { uid: string }) => row.uid));
    return unique.filter((uid) => !disabled.has(uid));
  }

  async disable(input: DeleteNotificationTokenInput): Promise<void> {
    const now = new Date().toISOString();
    if (input.tokenId) {
      await this.database.db
        .update(userNotificationTokens)
        .set({ enabled: false, deletedAt: now, updatedAt: now })
        .where(
          and(
            eq(userNotificationTokens.id, input.tokenId),
            eq(userNotificationTokens.uid, input.uid),
          ),
        );
      return;
    }

    if (!input.deviceId) throw new Error('notificationTokenIdentifierRequired');

    await this.database.db
      .update(userNotificationTokens)
      .set({ enabled: false, deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(userNotificationTokens.uid, input.uid),
          eq(userNotificationTokens.deviceId, input.deviceId),
          isNull(userNotificationTokens.deletedAt),
        ),
      );
  }

  private async findById(id: string): Promise<UserNotificationTokenEntity | null> {
    const rows = await this.database.db
      .select()
      .from(userNotificationTokens)
      .where(eq(userNotificationTokens.id, id))
      .limit(1);
    return rows[0] ?? null;
  }
}

export const userNotificationTokenRepository = new UserNotificationTokenRepository();

function toDomainToken(row: UserNotificationTokenEntity): RegisteredNotificationToken {
  return {
    id: row.id,
    uid: row.uid,
    platform: row.platform,
    provider: row.provider,
    deviceId: row.deviceId,
    token: row.token,
    locale: row.locale === 'en' ? 'en' : 'ar',
    enabled: row.enabled,
    lastSeenAt: row.lastSeenAt ?? undefined,
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? new Date().toISOString(),
    deletedAt: row.deletedAt,
    specialtyRequestsEnabled: row.specialtyRequestsEnabled,
  };
}
