import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/**
 * Notification server state — device tokens and per-user delivery preferences.
 *
 * These tables live in their own database on a separate Turso account so push
 * traffic never shares quota with users/product/orders. Nothing here stores
 * notification bodies or conversation content: those remain local-only in
 * AsolDB on the receiving device.
 *
 * The Web Push VAPID pair is not here either. Its public half is a constant in
 * `features/notifications/domain/web-push-config.ts` and its private half is
 * `WEB_PUSH_VAPID_PRIVATE_KEY`, matching how every other push credential in
 * the system is held.
 *
 * There is no foreign key to `users`. The link is the logical `uid`, and any
 * query that needs both sides resolves them separately and merges in memory —
 * a JOIN is impossible across two databases.
 */

export const userNotificationTokens = sqliteTable(
  "user_notification_tokens",
  {
    id: text("id").primaryKey(),
    uid: text("uid").notNull(),
    platform: text("platform", { enum: ["web", "android", "ios"] }).notNull(),
    provider: text("provider").notNull(),
    deviceId: text("device_id").notNull(),
    token: text("token").notNull(),
    /** UI language of the device, so push text is built in the reader's language. */
    locale: text("locale", { enum: ["ar", "en"] })
      .notNull()
      .default("ar"),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    specialtyRequestsEnabled: integer("specialty_requests_enabled", {
      mode: "boolean",
    })
      .notNull()
      .default(true),
    lastSeenAt: text("last_seen_at"),
    createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
    deletedAt: text("deleted_at"),
  },
  (table) => ({
    uidIdx: index("user_notification_tokens_uid_idx").on(table.uid),
    uidPlatformUnique: uniqueIndex(
      "user_notification_tokens_uid_platform_unique",
    ).on(table.uid, table.platform),
    tokenUnique: uniqueIndex("user_notification_tokens_token_unique").on(
      table.token,
    ),
  }),
);

export const userNotificationPreferences = sqliteTable(
  "user_notification_preferences",
  {
    uid: text("uid").primaryKey(),
    specialtyRequestsEnabled: integer("specialty_requests_enabled", {
      mode: "boolean",
    })
      .notNull()
      .default(true),
    updatedAt: text("updated_at").notNull(),
  },
);

export type UserNotificationTokenEntity =
  typeof userNotificationTokens.$inferSelect;
export type NewUserNotificationTokenEntity =
  typeof userNotificationTokens.$inferInsert;
export type UserNotificationPreferenceEntity =
  typeof userNotificationPreferences.$inferSelect;
