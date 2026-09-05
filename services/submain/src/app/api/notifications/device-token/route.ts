import {
  assertSubmainEnv,
  createSubmainRuntime,
  type DeleteNotificationTokenInput,
  type RegisterNotificationTokenInput,
} from '@asol/submain-composition';

import { businessErrorResponse, corsHeaders, preflight, jsonResponse, readJsonBody } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Register or revoke this device's push token.
 *
 * On this account because both operations verify that the caller owns the
 * device, and that check reads the users repository — a capability
 * `asol-notifications` must never hold. This account holds the users database
 * and the notifications database, which is what the check needs.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const { devices } = createSubmainRuntime();
    assertSubmainEnv();

    const body = await readJsonBody<RegisterNotificationTokenInput>(request);
    const token = await devices.registerDeviceToken(body);
    return jsonResponse(request, token, 200);
  } catch (error) {
    return businessErrorResponse(request, error);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const { devices } = createSubmainRuntime();
    assertSubmainEnv();

    const q = new URL(request.url).searchParams;
    const input: DeleteNotificationTokenInput = {
      uid: q.get('uid') ?? '',
      phone: q.get('phone') ?? '',
      deviceId: q.get('deviceId') ?? undefined,
      tokenId: q.get('tokenId') ?? undefined,
    };
    await devices.removeDeviceToken(input);
    return jsonResponse(request, { deleted: true }, 200);
  } catch (error) {
    return businessErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
