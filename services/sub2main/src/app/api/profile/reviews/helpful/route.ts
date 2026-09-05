import { assertSub2mainEnv, createSub2mainRuntime } from '@asol/sub2main-composition';

import { reviewActionErrorResponse, corsHeaders, preflight, jsonResponse, readJsonBody } from '../../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Mark a review helpful. Idempotency is the service's, not the route's. */
export async function POST(request: Request): Promise<Response> {
  try {
    const { profile } = createSub2mainRuntime();
    assertSub2mainEnv();

    const body = await readJsonBody<{ reviewId: string; uid: string }>(request);
    const result = await profile.reviews.helpful(body.reviewId, body.uid);
    return jsonResponse(request, result, 200);
  } catch (error) {
    return reviewActionErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
