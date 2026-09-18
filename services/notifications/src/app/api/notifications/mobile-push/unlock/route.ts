import { assertNotificationsEnv, createNotificationsRuntime } from '@asol/notifications-composition';

import { businessErrorResponse, preflight, jsonResponse, readJsonBody } from '../../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Decrypt the embedded mobile push credentials for a signed-in device.
 *
 * The check reads the users repository and the decryption needs the
 * server-only unlock key; this account holds both. The identity is the verified session, never a uid/phone pair from
 * the body: both are guessable, and the answer is a Firebase Admin key.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const { account, devices } = createNotificationsRuntime();
    assertNotificationsEnv();

    const claims = account.assertSignedIn(request);
    const body = await readJsonBody<{ credentialBlob?: unknown }>(request);
    const credentials = await devices.unlockMobilePush({
      uid: claims.uid,
      phone: claims.phone,
      credentialBlob: typeof body?.credentialBlob === 'string' ? body.credentialBlob : '',
    });
    return jsonResponse(request, credentials, 200);
  } catch (error) {
    return businessErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
