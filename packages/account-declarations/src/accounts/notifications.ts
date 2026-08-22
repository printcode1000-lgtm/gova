export const REQUIRED_ENV_KEYS = [
  'TURSO_NOTIFICATIONS_DATABASE_URL',
  'TURSO_NOTIFICATIONS_AUTH_TOKEN',
  'ASOL_NOTIFICATION_GRANT_SECRET',
  'WEB_PUSH_VAPID_PRIVATE_KEY',
] as const;

export const OPTIONAL_ENV_KEYS = [
  'FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64',
  'FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON',
  'APNS_TEAM_ID',
  'APNS_KEY_ID',
  'APNS_BUNDLE_ID',
  'APNS_PRIVATE_KEY',
  'APNS_PRODUCTION',
] as const;

export const NOTIFICATIONS_DECLARATION = {
  name: 'notifications',
  project: 'asol-notifications',
  email: 'bs.bid.story@gmail.com',
  tokenEnvVar: 'VERCEL_NOTIFICATIONS_TOKEN',
  serviceDir: 'services/notifications',
  requiredEnv: REQUIRED_ENV_KEYS,
  optionalEnv: OPTIONAL_ENV_KEYS,
  mirrorEntryPoints: [
    'core/config/server-env.ts',
  ],
  runtimeAssets: [],
} as const;
