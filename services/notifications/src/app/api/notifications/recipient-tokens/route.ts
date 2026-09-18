import { assertNotificationsEnv, createNotificationsRuntime } from '@asol/notifications-composition';

import { businessErrorResponse, preflight, jsonResponse, readJsonBody } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The FCM tokens a native sender may push to for its own grants.
 *
 * The caller is resolved against the users repository and the tokens are read
 * from this account's notifications database. The caller is the verified session, and each grant
 * must also name it as actor.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const { account, devices } = createNotificationsRuntime();
    assertNotificationsEnv();

    const claims = account.assertSignedIn(request);
    const body = await readJsonBody<{ grants?: unknown }>(request);
    const result = await devices.resolveRecipientTokens({
      uid: claims.uid,
      phone: claims.phone,
      grants: Array.isArray(body?.grants) ? body.grants : [],
    });
    return jsonResponse(request, result, 200);
  } catch (error) {
    return businessErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
