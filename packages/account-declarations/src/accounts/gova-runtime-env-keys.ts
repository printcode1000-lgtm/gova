/**
 * Runtime environment keys pushed to full-application Vercel projects.
 *
 * Provisioning-only keys (platform API tokens, foreign Vercel deploy tokens) are
 * deliberately excluded so a secondary application account cannot deploy or
 * mutate other deployments.
 */

export const LEGACY_GOVA_TURSO_RUNTIME_KEYS = [
  'TURSO_DATABASE_URL',
  'TURSO_AUTH_TOKEN',
  'TURSO_PRODUCT_DATABASE_URL',
  'TURSO_PRODUCT_AUTH_TOKEN',
  'TURSO_ADVERTISEMENTS_DATABASE_URL',
  'TURSO_ADVERTISEMENTS_AUTH_TOKEN',
  'TURSO_NOTIFICATIONS_DATABASE_URL',
  'TURSO_NOTIFICATIONS_AUTH_TOKEN',
] as const;

/** Must stay aligned with `DATABASE_SHARD_NAMES` in database-shards.ts */
export const GOVA_SHARD_DATABASE_NAMES = [
  'profile-core',
  'profile-contact',
  'profile-media',
  'profile-social',
  'profile-catalog',
  'profile-promotions',
  'profile-fulfillment',
  'system-ops',
  'orders-core',
  'orders-items',
  'orders-fulfillment',
  'orders-delivery-plans',
  'orders-shipping-quotes',
  'orders-payments',
  'orders-refunds',
  'orders-after-sales',
  'orders-disputes-audit',
] as const;

function envPrefixForShard(databaseName: string): string {
  return databaseName.toUpperCase().replace(/-/g, '_');
}

export const GOVA_SHARD_TURSO_RUNTIME_KEYS = GOVA_SHARD_DATABASE_NAMES.flatMap(
  (databaseName) => {
    const prefix = envPrefixForShard(databaseName);
    return [`${prefix}_DATABASE_URL`, `${prefix}_DATABASE_AUTH_TOKEN`] as const;
  },
);

export const GOVA_RUNTIME_REQUIRED_ENV_KEYS = [
  ...LEGACY_GOVA_TURSO_RUNTIME_KEYS,
  ...GOVA_SHARD_TURSO_RUNTIME_KEYS,
] as const;

export const GOVA_RUNTIME_OPTIONAL_ENV_KEYS = [
  'ASOL_NOTIFICATION_GRANT_SECRET',
  'NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL',
  'ASOL_SESSION_SIGNING_SECRET',
  'NEXT_PUBLIC_ASOL_PRODUCTS_URL',
  'NEXT_PUBLIC_ASOL_ORDERS_URL',
  'NEXT_PUBLIC_ASOL_PROFILES_URL',
  'NEXT_PUBLIC_ASOL_SUBMAIN_URL',
  'NEXT_PUBLIC_ASOL_SUB2MAIN_URL',
  'NEXT_PUBLIC_ASOL_API_BASE_URL',
  'NEXT_PUBLIC_ASOL_PUBLIC_WEB_ORIGIN',
  'NEXT_PUBLIC_ASOL_APP_STORE_URL',
  'NEXT_PUBLIC_ASOL_OTA_MANIFEST_URL',
  'ASOL_OTA_R2_PUBLIC_URL',
  'ASOL_OTA_R2_PREFIX',
  'ASOL_MOBILE_PUSH_UNLOCK_KEY',
  'ASOL_MOBILE_PUSH_CREDENTIAL_BLOB',
  'NEXT_PUBLIC_ASOL_MOBILE_PUSH_CREDENTIAL_BLOB',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_PUBLIC_URL',
  'PRODUCT_R2_ACCOUNT_ID',
  'PRODUCT_R2_ACCESS_KEY_ID',
  'PRODUCT_R2_SECRET_ACCESS_KEY',
  'PRODUCT_R2_BUCKET_NAME',
  'PRODUCT_R2_PUBLIC_URL',
  'APPAREL_PETS_R2_ACCOUNT_ID',
  'APPAREL_PETS_R2_ACCESS_KEY_ID',
  'APPAREL_PETS_R2_SECRET_ACCESS_KEY',
  'APPAREL_PETS_R2_BUCKET_NAME',
  'APPAREL_PETS_R2_PUBLIC_URL',
  'ASOL_OTA_R2_ACCOUNT_ID',
  'ASOL_OTA_R2_ACCESS_KEY_ID',
  'ASOL_OTA_R2_SECRET_ACCESS_KEY',
  'ASOL_OTA_R2_BUCKET_NAME',
  'PASSWORD_RECOVERY_GMAIL_USER',
  'PASSWORD_RECOVERY_GMAIL_APP_PASSWORD',
  'PASSWORD_RECOVERY_SIGNING_SECRET',
  'FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64',
  'FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON',
  'FIREBASE_ANDROID_GOOGLE_SERVICES_BASE64',
  'WEB_PUSH_VAPID_PRIVATE_KEY',
  'ASOL_CORS_ORIGINS',
] as const;

/**
 * What the gova frontend deployment actually requires.
 *
 * gova serves pages, static assets, `/api/health`, and the stateless
 * compatibility redirect boundary. The boundary needs the owner origins to
 * redirect to; nothing else in the deployment needs anything. The lists above
 * remain the full-application set and are still what `submain` inherits, but a
 * frontend must not be asked for a database URL, an R2 key, a signing secret, a
 * mail password, or a push credential, because it has no code that can use one.
 */
export const GOVA_FRONTEND_REQUIRED_ENV_KEYS = [
  'NEXT_PUBLIC_ASOL_CONTROL_URL',
  'NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL',
  'NEXT_PUBLIC_ASOL_PRODUCTS_URL',
  'NEXT_PUBLIC_ASOL_ORDERS_URL',
  'NEXT_PUBLIC_ASOL_PROFILES_URL',
  'NEXT_PUBLIC_ASOL_SUBMAIN_URL',
  'NEXT_PUBLIC_ASOL_SUB2MAIN_URL',
] as const;

export const GOVA_FRONTEND_OPTIONAL_ENV_KEYS = [
  'ASOL_RUNTIME_ROLE',
  'ASOL_CORS_ORIGINS',
  'NEXT_PUBLIC_ASOL_PUBLIC_WEB_ORIGIN',
  'NEXT_PUBLIC_ASOL_APP_STORE_URL',
  'NEXT_PUBLIC_ASOL_BASE_PATH',
  'NEXT_PUBLIC_ASOL_MODE',
  'NEXT_PUBLIC_BUILD_ID',
  'NEXT_PUBLIC_R2_PUBLIC_URL',
  'NEXT_PUBLIC_ASOL_OTA_MANIFEST_URL',
  'NEXT_PUBLIC_ASOL_OTA_PUBLIC_KEY',
  'NEXT_PUBLIC_ASOL_WEB_BUNDLE_VERSION',
  'NEXT_PUBLIC_ASOL_NATIVE_VERSION',
] as const;
