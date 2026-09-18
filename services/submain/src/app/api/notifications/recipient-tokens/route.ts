import { assertSubmainEnv, createSubmainRuntime } from '@asol/submain-composition';

import { businessErrorResponse, preflight, jsonResponse, readJsonBody } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The FCM tokens a native sender may push to for its own grants.
 *
 * On this account because the caller is resolved against the users repository
 * and the tokens are read from the notifications database — `asol-notifications`
 * must never hold the first. The caller is the verified session, and each grant
 * must also name it as actor.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const { account, devices } = createSubmainRuntime();
    assertSubmainEnv();

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
