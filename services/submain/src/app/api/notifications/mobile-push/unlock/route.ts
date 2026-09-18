import { assertSubmainEnv, createSubmainRuntime } from '@asol/submain-composition';

import { businessErrorResponse, preflight, jsonResponse, readJsonBody } from '../../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Decrypt the embedded mobile push credentials for a signed-in device.
 *
 * On this account because the check reads the users repository and the
 * decryption needs the server-only unlock key; `asol-notifications` holds
 * neither. The identity is the verified session, never a uid/phone pair from
 * the body: both are guessable, and the answer is a Firebase Admin key.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const { account, devices } = createSubmainRuntime();
    assertSubmainEnv();

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
