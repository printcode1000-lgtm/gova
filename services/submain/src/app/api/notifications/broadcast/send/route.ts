import { assertSubmainEnv, createSubmainRuntime } from '@asol/submain-composition';
import type { BroadcastNotificationInput } from '@asol/notifications-core';
import { businessErrorResponse, preflight, jsonResponse, readJsonBody } from '../../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  try {
    const { devices } = createSubmainRuntime();
    assertSubmainEnv();
    const claims = devices.assertSuperAdmin(request);
    const body = await readJsonBody<BroadcastNotificationInput>(request);
    const result = await devices.sendBroadcast({
      identity: { uid: claims.uid, phone: claims.phone },
      requestId: body.requestId,
      title: body.title,
      body: body.body,
      uids: body.uids,
      sendToAll: body.sendToAll,
    });
    return jsonResponse(request, result, 200);
  } catch (error) {
    return businessErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response { return preflight(request); }
