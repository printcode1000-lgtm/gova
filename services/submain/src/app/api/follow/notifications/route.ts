import { assertSubmainEnv, createSubmainRuntime } from '@asol/submain-composition';
import type { SendFollowerNotificationInput } from '@/features/follow/domain/follow.types';

import { businessErrorResponse, corsHeaders, preflight } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Notify a seller's followers. The session token travels in the header the
 * cross-origin contract already carries — this deployment never reads a cookie.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const { social } = createSubmainRuntime();
    assertSubmainEnv();

    const sessionToken = request.headers.get('x-asol-session-token') ?? '';
    const body = (await request.json()) as SendFollowerNotificationInput;
    const result = await social.follow.notifyFollowers(body, sessionToken);
    return Response.json(result, { status: 200, headers: corsHeaders(request) });
  } catch (error) {
    return businessErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
