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

export const passwordRecoveryChallenges = sqliteTable(
  'password_recovery_challenges',
  {
    id: text('id').primaryKey(),
    phoneHash: text('phone_hash').notNull(),
    uid: text('uid'),
    codeHash: text('code_hash').notNull(),
    resetTokenHash: text('reset_token_hash'),
    requestIpHash: text('request_ip_hash').notNull(),
    expiresAt: text('expires_at').notNull(),
    verifiedAt: text('verified_at'),
    consumedAt: text('consumed_at'),
    attempts: integer('attempts').notNull().default(0),
    createdAt: text('created_at').notNull(),
    lastAttemptAt: text('last_attempt_at'),
  },
  (table) => ({
    phoneCreatedIdx: index('password_recovery_phone_created_idx').on(
      table.phoneHash,
      table.createdAt,
    ),
    ipCreatedIdx: index('password_recovery_ip_created_idx').on(
      table.requestIpHash,
      table.createdAt,
    ),
    resetTokenIdx: index('password_recovery_reset_token_idx').on(table.resetTokenHash),
  }),
);

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

export const otaReleases = sqliteTable(
  'ota_releases',
  {
    releaseId: text('release_id').primaryKey(),
    version: text('version').notNull(),
    manifestCreatedAt: text('manifest_created_at').notNull(),
    baseUrl: text('base_url').notNull(),
    size: integer('size').notNull(),
    fileCount: integer('file_count').notNull(),
    minimumNativeVersion: text('minimum_native_version').notNull(),
    mandatory: integer('mandatory', { mode: 'boolean' }).notNull().default(false),
    notes: text('notes').notNull().default(''),
    signature: text('signature').notNull(),
    manifestJson: text('manifest_json').notNull(),
    approved: integer('approved', { mode: 'boolean' }).notNull().default(false),
    rolloutPercentage: integer('rollout_percentage').notNull().default(100),
    approvedAt: text('approved_at'),
    approvedByUid: text('approved_by_uid'),
    revokedAt: text('revoked_at'),
    revokedByUid: text('revoked_by_uid'),
    discoveredAt: text('discovered_at').notNull(),
    lastSeenAt: text('last_seen_at').notNull(),
  },
  (table) => ({
    versionIdx: index('ota_releases_version_idx').on(table.version),
    approvedIdx: index('ota_releases_approved_idx').on(table.approved),
  }),
);

export const otaReleaseAudit = sqliteTable(
  'ota_release_audit',
  {
    id: text('id').primaryKey(),
    releaseId: text('release_id').notNull(),
    version: text('version').notNull(),
    action: text('action', { enum: ['discovered', 'approved', 'revoked', 'rollout_changed'] }).notNull(),
    actorUid: text('actor_uid'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    releaseIdx: index('ota_release_audit_release_idx').on(table.releaseId),
    createdAtIdx: index('ota_release_audit_created_at_idx').on(table.createdAt),
  }),
);

/**
 * Live kill switch for capability-backed features.
 *
 * This is the only control plane that takes effect without publishing an OTA
 * release or a store build: OTA replaces the bundle, and a store release needs
 * review. Turning a row off hides the feature on the next flag refresh.
 */
export const featureFlags = sqliteTable(
  'feature_flags',
  {
    key: text('key').primaryKey(),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
    /** Free-text note explaining why the flag is in its current state. */
    notes: text('notes').notNull().default(''),
    updatedAt: text('updated_at').notNull(),
    updatedByUid: text('updated_by_uid'),
  },
  (table) => ({
    enabledIdx: index('feature_flags_enabled_idx').on(table.enabled),
  }),
);

export type FeatureFlagEntity = typeof featureFlags.$inferSelect;
export type NewFeatureFlagEntity = typeof featureFlags.$inferInsert;
export type UserEntity = typeof users.$inferSelect;
export type NewUserEntity = typeof users.$inferInsert;
export type PasswordRecoveryChallengeEntity = typeof passwordRecoveryChallenges.$inferSelect;
export type NewPasswordRecoveryChallengeEntity = typeof passwordRecoveryChallenges.$inferInsert;
export type UserNotificationTokenEntity = typeof userNotificationTokens.$inferSelect;
export type NewUserNotificationTokenEntity = typeof userNotificationTokens.$inferInsert;
export type UserNotificationPreferenceEntity = typeof userNotificationPreferences.$inferSelect;
export type NotificationVapidSettingsEntity = typeof notificationVapidSettings.$inferSelect;
export type NewNotificationVapidSettingsEntity = typeof notificationVapidSettings.$inferInsert;
export type OtaReleaseEntity = typeof otaReleases.$inferSelect;
export type NewOtaReleaseEntity = typeof otaReleases.$inferInsert;
export type OtaReleaseAuditEntity = typeof otaReleaseAudit.$inferSelect;
export type NewOtaReleaseAuditEntity = typeof otaReleaseAudit.$inferInsert;
