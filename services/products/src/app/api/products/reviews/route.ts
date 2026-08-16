import { assertProductsEnv, createProductsRuntime } from '@asol/products-composition';
import { corsHeaders, preflight, reviewErrorResponse } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Review reads. Writes stay on the main app: creating a review can change a
 * product's aggregate rating, which feeds the profile counts this deployment
 * cannot touch.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    // Layer 2. Built per request, never at module scope: module scope runs during
    // `next build`, where no account credential exists.
    const api = createProductsRuntime();
    assertProductsEnv();

    const q = new URL(request.url).searchParams;
    const sort = q.get('sort');
    const data = await api.reviews.list(
      q.get('productId') ?? '',
      sort === 'highest' || sort === 'lowest' ? sort : 'newest',
      Number(q.get('offset') || 0),
      Number(q.get('limit') || 3),
      q.get('uid') ?? '',
    );
    return Response.json(data, { status: 200, headers: corsHeaders(request) });
  } catch (error) {
    return reviewErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
