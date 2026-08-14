import { notificationsDataSource } from "@/modules/data-access/core";
import "server-only";

import { and, eq, inArray, isNull } from "drizzle-orm";
import type { IDatabaseClient } from "@/modules/data-access/core/database/database-client.interface";
import {
  userNotificationTokens,
  userNotificationPreferences,
  type NewUserNotificationTokenEntity,
  type UserNotificationTokenEntity,
} from "@/modules/data-access/core/database/notifications/notifications.schema";
import type {
  DeleteNotificationTokenInput,
  RegisteredNotificationToken,
  RegisterNotificationTokenInput,
} from "@/features/notifications/contracts";

function makeTokenId(
  uid: string,
  platform: RegisterNotificationTokenInput["platform"],
): string {
  return `ntok_${uid}_${platform}`.replace(/[^a-zA-Z0-9_:-]/g, "_");
}

export class UserNotificationTokenRepository {
  constructor(
    private readonly database: IDatabaseClient = notificationsDataSource,
  ) {}

  async upsert(
    input: RegisterNotificationTokenInput,
  ): Promise<RegisteredNotificationToken> {
    const now = new Date().toISOString();
    // One row per user and platform. A login on another device, a browser
    // re-subscription, or a provider refresh replaces this row.
    const id = makeTokenId(input.uid, input.platform);
    const locale = input.locale === "en" ? "en" : "ar";
    await this.releaseTokenValue(input.token, input.uid, input.platform);
    const row: NewUserNotificationTokenEntity = {
      id,
      uid: input.uid,
      platform: input.platform,
      provider: input.provider,
      deviceId: input.deviceId,
      token: input.token,
      locale,
      enabled: true,
      specialtyRequestsEnabled: true,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    await this.database.db
      .insert(userNotificationTokens)
      .values(row)
      .onConflictDoUpdate({
        target: [userNotificationTokens.uid, userNotificationTokens.platform],
        set: {
          provider: row.provider,
          deviceId: row.deviceId,
          token: row.token,
          locale,
          enabled: true,
          lastSeenAt: now,
          updatedAt: now,
          deletedAt: null,
        },
      });

    const saved = await this.findByUidPlatform(input.uid, input.platform);
    if (!saved) throw new Error("notificationTokenSaveFailed");
    return toDomainToken(saved);
  }

  /**
   * A push token addresses exactly one installation. When the same value shows
   * up under a different row — a reinstall that produced a new device id, or a
   * second account on the same handset — the older row is stale and still holds
   * the `token` unique index. Delete that stale registration so the value can
   * move to its single current owner.
   */
  private async releaseTokenValue(
    token: string,
    uid: string,
    platform: RegisterNotificationTokenInput["platform"],
  ): Promise<void> {
    const conflicting: Array<{ id: string; uid: string; platform: string }> =
      await this.database.db
        .select({
          id: userNotificationTokens.id,
          uid: userNotificationTokens.uid,
          platform: userNotificationTokens.platform,
        })
        .from(userNotificationTokens)
        .where(eq(userNotificationTokens.token, token));
    const staleIds = conflicting
      .filter((row) => row.uid !== uid || row.platform !== platform)
      .map((row) => row.id);
    if (staleIds.length === 0) return;
    await this.database.db
      .delete(userNotificationTokens)
      .where(inArray(userNotificationTokens.id, staleIds));
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

  async listByUids(
    uids: string[],
  ): Promise<Record<string, RegisteredNotificationToken[]>> {
    const pairs = await Promise.all(
      uids.map(async (uid) => [uid, await this.listByUid(uid)] as const),
    );
    return Object.fromEntries(pairs);
  }

  async setSpecialtyRequestsEnabled(
    uid: string,
    enabled: boolean,
  ): Promise<void> {
    const updatedAt = new Date().toISOString();
    await this.database.execute(
      `INSERT INTO user_notification_preferences (uid, specialty_requests_enabled, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(uid) DO UPDATE SET specialty_requests_enabled = excluded.specialty_requests_enabled, updated_at = excluded.updated_at`,
      [uid, enabled ? 1 : 0, updatedAt],
    );
    await this.database.db
      .update(userNotificationTokens)
      .set({ specialtyRequestsEnabled: enabled, updatedAt })
      .where(eq(userNotificationTokens.uid, uid));
  }

  async setProductConversationsEnabled(
    uid: string,
    enabled: boolean,
  ): Promise<void> {
    const updatedAt = new Date().toISOString();
    await this.database.execute(
      `INSERT INTO user_notification_preferences (uid, specialty_requests_enabled, product_conversations_enabled, updated_at)
       VALUES (?, 1, ?, ?)
       ON CONFLICT(uid) DO UPDATE SET product_conversations_enabled = excluded.product_conversations_enabled, updated_at = excluded.updated_at`,
      [uid, enabled ? 1 : 0, updatedAt],
    );
  }

  async specialtyRequestsEnabled(uid: string): Promise<boolean> {
    const rows = await this.database.db
      .select({ enabled: userNotificationPreferences.specialtyRequestsEnabled })
      .from(userNotificationPreferences)
      .where(eq(userNotificationPreferences.uid, uid))
      .limit(1);
    return rows[0]?.enabled ?? true;
  }

  async productConversationsEnabled(uid: string): Promise<boolean> {
    const rows = await this.database.db
      .select({ enabled: userNotificationPreferences.productConversationsEnabled })
      .from(userNotificationPreferences)
      .where(eq(userNotificationPreferences.uid, uid))
      .limit(1);
    return rows[0]?.enabled ?? true;
  }

  async filterSpecialtyRequestsEnabled(uids: string[]): Promise<string[]> {
    const unique = Array.from(new Set(uids.filter(Boolean)));
    if (unique.length === 0) return [];
    const rows = await this.database.db
      .select({
        uid: userNotificationPreferences.uid,
        enabled: userNotificationPreferences.specialtyRequestsEnabled,
      })
      .from(userNotificationPreferences)
      .where(inArray(userNotificationPreferences.uid, unique));
    const disabled = new Set(
      rows
        .filter((row: { uid: string; enabled: boolean }) => !row.enabled)
        .map((row: { uid: string }) => row.uid),
    );
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

    if (!input.deviceId) throw new Error("notificationTokenIdentifierRequired");

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

  private async findByUidPlatform(
    uid: string,
    platform: RegisterNotificationTokenInput["platform"],
  ): Promise<UserNotificationTokenEntity | null> {
    const rows = await this.database.db
      .select()
      .from(userNotificationTokens)
      .where(
        and(
          eq(userNotificationTokens.uid, uid),
          eq(userNotificationTokens.platform, platform),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }
}

export const userNotificationTokenRepository =
  new UserNotificationTokenRepository();

function toDomainToken(
  row: UserNotificationTokenEntity,
): RegisteredNotificationToken {
  return {
    id: row.id,
    uid: row.uid,
    platform: row.platform,
    provider: row.provider,
    deviceId: row.deviceId,
    token: row.token,
    locale: row.locale === "en" ? "en" : "ar",
    enabled: row.enabled,
    lastSeenAt: row.lastSeenAt ?? undefined,
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? new Date().toISOString(),
    deletedAt: row.deletedAt,
    specialtyRequestsEnabled: row.specialtyRequestsEnabled,
  };
}
