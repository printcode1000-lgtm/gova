import { assertSub2mainEnv, createSub2mainRuntime } from '@asol/sub2main-composition';
import type { SaveProfileReviewInput, UpdateProfileReviewInput } from '@/features/profile/domain/profile-review.entity';

import { reviewErrorResponse, corsHeaders, preflight, jsonResponse, readJsonBody } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Profile reviews. This account holds both the product and profile databases the read needs, so the whole family
 * — list, create, update, delete — is answered here.
 *
 * The query defaults are the application's: `newest` for an unrecognised sort,
 * offset `0`, limit `3`. A different default is a different page of results for
 * the same request.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const { profile } = createSub2mainRuntime();
    assertSub2mainEnv();

    const q = new URL(request.url).searchParams;
    const sort = q.get('sort');
    const data = await profile.reviews.list(
      q.get('targetUid') ?? '',
      sort === 'highest' || sort === 'lowest' ? sort : 'newest',
      Number(q.get('offset') || 0),
      Number(q.get('limit') || 3),
      q.get('uid') ?? '',
    );
    return jsonResponse(request, data, 200);
  } catch (error) {
    return reviewErrorResponse(request, error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { profile } = createSub2mainRuntime();
    assertSub2mainEnv();

    const created = await profile.reviews.create(await readJsonBody<SaveProfileReviewInput>(request));
    return jsonResponse(request, created, 201);
  } catch (error) {
    return reviewErrorResponse(request, error);
  }
}

export async function PUT(request: Request): Promise<Response> {
  try {
    const { profile } = createSub2mainRuntime();
    assertSub2mainEnv();

    const updated = await profile.reviews.update(await readJsonBody<UpdateProfileReviewInput>(request));
    return jsonResponse(request, updated, 200);
  } catch (error) {
    return reviewErrorResponse(request, error);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const { profile } = createSub2mainRuntime();
    assertSub2mainEnv();

    const q = new URL(request.url).searchParams;
    await profile.reviews.delete(q.get('reviewId') ?? '', q.get('uid') ?? '');
    return jsonResponse(request, { deleted: true }, 200);
  } catch (error) {
    return reviewErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
