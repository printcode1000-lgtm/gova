import { assertNotificationsEnv, createNotificationsRuntime } from '@asol/notifications-composition';
import type { NotificationTestInput } from '@asol/notifications-composition';

import { businessErrorResponse, corsHeaders, preflight, jsonResponse, readJsonBody } from '../../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The Super Admin's broadcast delivery test.
 *
 * It verifies a session: the identity is the signed caller, never the body.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const { devices } = createNotificationsRuntime();
    assertNotificationsEnv();

    const claims = devices.assertSuperAdmin(request);
    const body = await readJsonBody<NotificationTestInput>(request);
    const result = await devices.sendBroadcastTest({
      identity: { uid: claims.uid, phone: claims.phone },
      requestId: body.requestId,
      scenarioId: body.scenarioId,
      title: body.title,
      body: body.body,
      routeHref: body.routeHref,
    });
    return jsonResponse(request, result, 200);
  } catch (error) {
    return businessErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
