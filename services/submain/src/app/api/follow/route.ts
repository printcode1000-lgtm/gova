import { assertSubmainEnv, createSubmainRuntime } from '@asol/submain-composition';
import type { FollowMutationInput, FollowTargetType } from '@/features/follow/domain/follow.types';

import { businessErrorResponse, corsHeaders, preflight } from '../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  try {
    const { social } = createSubmainRuntime();
    assertSubmainEnv();

    const body = (await request.json()) as FollowMutationInput;
    const result = await social.follow.follow(body);
    return Response.json(result, { status: 200, headers: corsHeaders(request) });
  } catch (error) {
    return businessErrorResponse(request, error);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const { social } = createSubmainRuntime();
    assertSubmainEnv();

    const q = new URL(request.url).searchParams;
    const result = await social.follow.unfollow({
      viewerUid: q.get('viewerUid') ?? '',
      targetType: q.get('targetType') as FollowTargetType,
      targetId: q.get('targetId') ?? '',
      targetOwnerUid: q.get('targetOwnerUid') ?? undefined,
    });
    return Response.json(result, { status: 200, headers: corsHeaders(request) });
  } catch (error) {
    return businessErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
