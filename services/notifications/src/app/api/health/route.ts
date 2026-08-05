export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Liveness only. It deliberately reports whether credentials are *present*,
 * never their values, so the endpoint can stay public without leaking anything
 * useful — and so a misconfigured deployment is visible without sending a real
 * push to find out.
 */
export function GET(): Response {
  return Response.json({
    service: 'asol-notifications',
    ok: true,
    configured: {
      notificationsDatabase: Boolean(process.env.TURSO_NOTIFICATIONS_DATABASE_URL),
      // The only shared value with the main app: it signs grants, this verifies.
      grantSecret: Boolean(
        process.env.ASOL_NOTIFICATION_GRANT_SECRET ??
          process.env.ASOL_SESSION_SIGNING_SECRET,
      ),
      firebase: Boolean(
        process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64 ??
          process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON,
      ),
      apns: Boolean(process.env.APNS_TEAM_ID && process.env.APNS_KEY_ID && process.env.APNS_PRIVATE_KEY),
    },
  });
}
