import { assertSub2mainEnv, createSub2mainRuntime } from '@asol/sub2main-composition';

import { businessErrorResponse, corsHeaders, preflight } from '../../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Mark a review helpful. Idempotency is the service's, not the route's. */
export async function POST(request: Request): Promise<Response> {
  try {
    const { products } = createSub2mainRuntime();
    assertSub2mainEnv();

    const body = (await request.json()) as { reviewId: string; uid: string };
    const result = await products.reviews.helpful(body.reviewId, body.uid);
    return Response.json(result, { status: 200, headers: corsHeaders(request) });
  } catch (error) {
    return businessErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
