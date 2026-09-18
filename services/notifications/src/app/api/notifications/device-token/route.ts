import {
  assertNotificationsEnv,
  createNotificationsRuntime,
  type DeleteNotificationTokenInput,
  type RegisterNotificationTokenInput,
} from '@asol/notifications-composition';

import { businessErrorResponse, corsHeaders, preflight, jsonResponse, readJsonBody } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Register or revoke this device's push token.
 *
 * Both operations verify that the caller owns the device, and that check reads
 * the users repository; this account holds it alongside its own notifications
 * database because it owns the whole notification surface.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const { devices } = createNotificationsRuntime();
    assertNotificationsEnv();

    const body = await readJsonBody<RegisterNotificationTokenInput>(request);
    const token = await devices.registerDeviceToken(body);
    return jsonResponse(request, token, 200);
  } catch (error) {
    return businessErrorResponse(request, error);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const { devices } = createNotificationsRuntime();
    assertNotificationsEnv();

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
