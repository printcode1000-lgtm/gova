import 'server-only';

import { and, eq, inArray, isNull } from 'drizzle-orm';
import { dbClient } from '@/core/database/db-client';
import type { IDatabaseClient } from '@/core/database/database-client.interface';
import {
  userNotificationTokens,
  userNotificationPreferences,
  type NewUserNotificationTokenEntity,
  type UserNotificationTokenEntity,
} from '@/core/database/schema';
import type {
  DeleteNotificationTokenInput,
  RegisteredNotificationToken,
  RegisterNotificationTokenInput,
} from '../domain/entities';

function makeTokenId(uid: string, platform: string, deviceId: string): string {
  return `ntok_${uid}_${platform}_${deviceId}`.replace(/[^a-zA-Z0-9_:-]/g, '_');
}

export class UserNotificationTokenRepository {
  constructor(private readonly database: IDatabaseClient = dbClient) {}

  async upsert(input: RegisterNotificationTokenInput): Promise<RegisteredNotificationToken> {
    const now = new Date().toISOString();
    const existing = await this.database.db
      .select()
      .from(userNotificationTokens)
      .where(
        and(
          eq(userNotificationTokens.uid, input.uid),
          eq(userNotificationTokens.deviceId, input.deviceId),
          eq(userNotificationTokens.platform, input.platform),
          isNull(userNotificationTokens.deletedAt),
        ),
      )
      .limit(1);

    const id = existing[0]?.id ?? makeTokenId(input.uid, input.platform, input.deviceId);
    const row: NewUserNotificationTokenEntity = {
      id,
      uid: input.uid,
      platform: input.platform,
      provider: input.provider,
      deviceId: input.deviceId,
      token: input.token,
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
    enabled: row.enabled,
    lastSeenAt: row.lastSeenAt ?? undefined,
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? new Date().toISOString(),
    deletedAt: row.deletedAt,
    specialtyRequestsEnabled: row.specialtyRequestsEnabled,
  };
}
