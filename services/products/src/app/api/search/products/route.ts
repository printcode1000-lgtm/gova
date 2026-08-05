import type {
  ProductSearchFilters,
  ProductSearchRequest,
} from '@/features/product-search/entities/product-search.types';
import { searchProducts } from '@/features/product-search/services/product-search-products.server';
import { corsHeaders, preflight, searchErrorResponse } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Product search. Read-only, and the heaviest product query in the system. */
export async function GET(request: Request): Promise<Response> {
  try {
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
    const data = await searchProducts(payload);
    return Response.json(data, { status: 200, headers: corsHeaders(request) });
  } catch (error) {
    return searchErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
