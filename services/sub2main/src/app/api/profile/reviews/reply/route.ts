import { assertSub2mainEnv, createSub2mainRuntime } from '@asol/sub2main-composition';

import { reviewActionErrorResponse, corsHeaders, preflight, jsonResponse, readJsonBody } from '../../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** A seller's reply to a review: saved by POST, withdrawn by DELETE. */
export async function POST(request: Request): Promise<Response> {
  try {
    const { profile } = createSub2mainRuntime();
    assertSub2mainEnv();

    const body = await readJsonBody<{ reviewId: string; uid: string; text: string }>(request);
    const result = await profile.reviews.saveReply(body.reviewId, body.uid, body.text);
    return jsonResponse(request, result, 200);
  } catch (error) {
    return reviewActionErrorResponse(request, error);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const { profile } = createSub2mainRuntime();
    assertSub2mainEnv();

    const q = new URL(request.url).searchParams;
    await profile.reviews.deleteReply(q.get('reviewId') ?? '', q.get('uid') ?? '');
    return jsonResponse(request, { deleted: true }, 200);
  } catch (error) {
    return reviewActionErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
