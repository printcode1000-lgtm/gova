import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uid: text('uid').notNull().unique(),
  phone: text('phone').notNull().unique(),
  email: text('email'),
  password: text('password').notNull(),
  lastLoginAt: text('last_login_at'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
  deletedAt: text('deleted_at'),
});

export const userNotificationTokens = sqliteTable(
  'user_notification_tokens',
  {
    id: text('id').primaryKey(),
    uid: text('uid').notNull(),
    platform: text('platform', { enum: ['web', 'android', 'ios'] }).notNull(),
    provider: text('provider').notNull(),
    deviceId: text('device_id').notNull(),
    token: text('token').notNull(),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
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

export type UserEntity = typeof users.$inferSelect;
export type NewUserEntity = typeof users.$inferInsert;
export type UserNotificationTokenEntity = typeof userNotificationTokens.$inferSelect;
export type NewUserNotificationTokenEntity = typeof userNotificationTokens.$inferInsert;
export type NotificationVapidSettingsEntity = typeof notificationVapidSettings.$inferSelect;
export type NewNotificationVapidSettingsEntity = typeof notificationVapidSettings.$inferInsert;
