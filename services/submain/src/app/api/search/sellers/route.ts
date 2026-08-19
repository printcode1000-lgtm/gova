import { assertSubmainEnv, createSubmainRuntime } from '@asol/submain-composition';
import type { SellerSearchRequest } from '@asol/submain-composition';
import { corsHeaders, preflight, searchErrorResponse } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  try {
    const { search } = createSubmainRuntime();
    assertSubmainEnv();

    const q = new URL(request.url).searchParams;
    const payload: SellerSearchRequest = {
      q: q.get('q') ?? '',
      mainCategoryId: q.get('mainCategoryId') ?? '',
      subcategoryId: q.get('subcategoryId') ?? '',
      sort: (q.get('sort') as SellerSearchRequest['sort']) ?? 'relevance',
      offset: Number(q.get('offset') || 0),
      limit: Number(q.get('limit') || 24),
      minRating: (q.get('minRating') as SellerSearchRequest['minRating']) ?? '',
    };
    const data = await search.sellers(payload);
    return Response.json(data, { status: 200, headers: corsHeaders(request) });
  } catch (error) {
    return searchErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
