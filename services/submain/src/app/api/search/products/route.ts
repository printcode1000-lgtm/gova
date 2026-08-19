import {
  assertSubmainEnv,
  createSubmainRuntime,
  type ProductSearchFilters,
  type ProductSearchRequest,
} from '@asol/submain-composition';
import { corsHeaders, preflight, searchErrorResponse } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  try {
    const { search } = createSubmainRuntime();
    assertSubmainEnv();

    const q = new URL(request.url).searchParams;
    const payload: ProductSearchRequest = {
      q: q.get('q') ?? '',
      ownerUid: q.get('ownerUid') ?? '',
      mainCategoryId: q.get('mainCategoryId') ?? '',
      subcategoryId: q.get('subcategoryId') ?? '',
      fields: q.get('fields')?.split(',').filter(Boolean) ?? [],
      sort: (q.get('sort') as ProductSearchRequest['sort']) ?? 'newest',
      offset: Number(q.get('offset') || 0),
      limit: Number(q.get('limit') || 24),
      includeDrafts: q.get('includeDrafts') === 'true',
      filters: {
        availableOnly: q.get('availableOnly') === 'true',
        needsCar: q.get('needsCar') === 'true',
        status: (q.get('status') as ProductSearchFilters['status']) ?? '',
        minRating: (q.get('minRating') as ProductSearchFilters['minRating']) ?? '',
      },
    };
    const data = await search.products(payload);
    return Response.json(data, { status: 200, headers: corsHeaders(request) });
  } catch (error) {
    return searchErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
