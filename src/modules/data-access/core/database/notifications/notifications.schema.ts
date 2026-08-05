import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * Notification server state — device tokens, per-user delivery preferences, and
 * the Web Push VAPID key pair.
 *
 * These tables live in their own database on a separate Turso account so push
 * traffic never shares quota with users/product/orders. Nothing here stores
 * notification bodies or conversation content: those remain local-only in
 * AsolDB on the receiving device.
 *
 * There is no foreign key to `users`. The link is the logical `uid`, and any
 * query that needs both sides resolves them separately and merges in memory —
 * a JOIN is impossible across two databases.
 */

export const userNotificationTokens = sqliteTable(
  'user_notification_tokens',
  {
    id: text('id').primaryKey(),
    uid: text('uid').notNull(),
    platform: text('platform', { enum: ['web', 'android', 'ios'] }).notNull(),
    provider: text('provider').notNull(),
    deviceId: text('device_id').notNull(),
    token: text('token').notNull(),
    /** UI language of the device, so push text is built in the reader's language. */
    locale: text('locale', { enum: ['ar', 'en'] })
      .notNull()
      .default('ar'),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    specialtyRequestsEnabled: integer('specialty_requests_enabled', { mode: 'boolean' })
      .notNull()
      .default(true),
    lastSeenAt: text('last_seen_at'),
    createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
    deletedAt: text('deleted_at'),
  },
  (table) => ({
    uidIdx: index('user_notification_tokens_uid_idx').on(table.uid),
    uidDeviceUnique: uniqueIndex('user_notification_tokens_uid_device_unique').on(
      table.uid,
      table.deviceId,
      table.platform,
    ),
    tokenUnique: uniqueIndex('user_notification_tokens_token_unique').on(table.token),
  }),
);

export const notificationVapidSettings = sqliteTable('notification_vapid_settings', {
  id: text('id').primaryKey(),
  publicKey: text('public_key').notNull(),
  privateKey: text('private_key').notNull(),
  subject: text('subject').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const userNotificationPreferences = sqliteTable('user_notification_preferences', {
  uid: text('uid').primaryKey(),
  specialtyRequestsEnabled: integer('specialty_requests_enabled', { mode: 'boolean' })
    .notNull()
    .default(true),
  updatedAt: text('updated_at').notNull(),
});

export type UserNotificationTokenEntity = typeof userNotificationTokens.$inferSelect;
export type NewUserNotificationTokenEntity = typeof userNotificationTokens.$inferInsert;
export type UserNotificationPreferenceEntity = typeof userNotificationPreferences.$inferSelect;
export type NotificationVapidSettingsEntity = typeof notificationVapidSettings.$inferSelect;
export type NewNotificationVapidSettingsEntity = typeof notificationVapidSettings.$inferInsert;
