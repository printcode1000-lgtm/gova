import { credentialHealthResponse } from '@asol/service-runtime-core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Liveness only — presence, never values. Each entry is a delivery channel this deployment can
 * lose independently, which is why a missing one degrades a channel rather than failing the
 * service.
 */
export function GET(): Response {
  return credentialHealthResponse({
    service: 'asol-notifications',
    credentials: {
      notificationsDatabase: process.env.TURSO_NOTIFICATIONS_DATABASE_URL,
      // The only shared value with the main app: it signs grants, this verifies.
      grantSecret:
        process.env.ASOL_NOTIFICATION_GRANT_SECRET ?? process.env.ASOL_SESSION_SIGNING_SECRET,
      firebase:
        process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64 ??
        process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON,
      apns:
        process.env.APNS_TEAM_ID && process.env.APNS_KEY_ID && process.env.APNS_PRIVATE_KEY,
      // Only the private half is configuration; the public key and subject are constants in the
      // bundle, so there is nothing else here to be missing.
      webPush: process.env.WEB_PUSH_VAPID_PRIVATE_KEY,
      // The session-bound account surface this deployment owns: identity checks
      // read the users database, and every signed route verifies the session.
      usersDatabase: process.env.TURSO_DATABASE_URL,
      sessionSecret: process.env.ASOL_SESSION_SIGNING_SECRET,
      // Native senders unlock their Firebase credentials here.
      mobilePushUnlock: process.env.ASOL_MOBILE_PUSH_UNLOCK_KEY,
    },
  });
}
