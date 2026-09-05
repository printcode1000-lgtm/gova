import { assertSubmainEnv, createSubmainRuntime } from '@asol/submain-composition';

import { businessErrorResponse, corsHeaders, preflight, jsonResponse } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Every device registered on the calling account. Never returns a push token.
 *
 * This account, not `asol-notifications`, because the answer needs a verified
 * session as well as the notifications database and only this one holds both.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const { account, devices } = createSubmainRuntime();
    assertSubmainEnv();

    const claims = account.assertSignedIn(request);
    const list = await devices.listAccountDevices({ uid: claims.uid, phone: claims.phone });
    return jsonResponse(request, list, 200);
  } catch (error) {
    return businessErrorResponse(request, error);
  }
}

/** Revoke one device's registration by its device id. */
export async function DELETE(request: Request): Promise<Response> {
  try {
    const { account, devices } = createSubmainRuntime();
    assertSubmainEnv();

    const claims = account.assertSignedIn(request);
    const deviceId = new URL(request.url).searchParams.get('deviceId')?.trim() ?? '';
    // A mapped business code: an unmapped one falls through as a 500, which
    // would report a malformed request as a server fault.
    if (!deviceId) throw new Error('notificationTokenIdentifierRequired');

    await devices.removeDeviceToken({ uid: claims.uid, phone: claims.phone, deviceId });
    return jsonResponse(request, { deleted: true }, 200);
  } catch (error) {
    return businessErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
