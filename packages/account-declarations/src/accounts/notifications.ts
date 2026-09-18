export const REQUIRED_ENV_KEYS = [
  'TURSO_NOTIFICATIONS_DATABASE_URL',
  'TURSO_NOTIFICATIONS_AUTH_TOKEN',
  'ASOL_NOTIFICATION_GRANT_SECRET',
  'WEB_PUSH_VAPID_PRIVATE_KEY',
  // This account owns the whole `/api/notifications/**` surface, so the
  // session-bound routes moved here: they resolve the caller against the users
  // database and verify the signed session. A deliberate widening — the account
  // used to hold neither.
  'TURSO_DATABASE_URL',
  'TURSO_AUTH_TOKEN',
  'ASOL_SESSION_SIGNING_SECRET',
] as const;

export const OPTIONAL_ENV_KEYS = [
  'FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64',
  'FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON',
  'APNS_TEAM_ID',
  'APNS_KEY_ID',
  'APNS_BUNDLE_ID',
  'APNS_PRIVATE_KEY',
  'APNS_PRODUCTION',
  // The native sender's unlock decrypts the embedded Firebase Admin blob here.
  'ASOL_MOBILE_PUSH_UNLOCK_KEY',
  'ASOL_MOBILE_PUSH_CREDENTIAL_BLOB',
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
