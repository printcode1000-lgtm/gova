import { assertSubmainEnv, createSubmainRuntime } from '@asol/submain-composition';
import type { NotificationTestInput } from '@asol/notifications-core';

import { businessErrorResponse, corsHeaders, preflight, jsonResponse, readJsonBody } from '../../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The Super Admin's broadcast delivery test.
 *
 * On this account because it verifies a session: the identity is the signed
 * caller, never the body. `asol-notifications` holds the database but not the
 * signing secret, and it stays that way.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const { devices } = createSubmainRuntime();
    assertSubmainEnv();

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
