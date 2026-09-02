import { assertSubmainEnv, createSubmainRuntime } from '@asol/submain-composition';
import type { FollowTargetType } from '@/features/follow/domain/follow.types';

import { businessErrorResponse, corsHeaders, preflight } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Whether the viewer follows the target. A guest has no viewer, and that is a valid question. */
export async function GET(request: Request): Promise<Response> {
  try {
    const { social } = createSubmainRuntime();
    assertSubmainEnv();

    const q = new URL(request.url).searchParams;
    const status = await social.follow.getStatus({
      targetType: q.get('targetType') as FollowTargetType,
      targetId: q.get('targetId') ?? '',
      viewerUid: q.get('viewerUid') ?? undefined,
      targetOwnerUid: q.get('targetOwnerUid') ?? undefined,
    });
    return Response.json(status, { status: 200, headers: corsHeaders(request) });
  } catch (error) {
    return businessErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
