import { assertSubmainEnv, createSubmainRuntime } from '@asol/submain-composition';
import { isSearchCategorySelectionShaped } from '@/features/product-search/domain/product-search.request';

import { corsHeaders, preflight, searchErrorResponse } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  try {
    const { search, catalog } = createSubmainRuntime();
    assertSubmainEnv();

    const q = new URL(request.url).searchParams;
    const mainCategoryId = q.get('mainCategoryId') ?? '';
    const subcategoryId = q.get('subcategoryId') ?? '';
    if (
      !isSearchCategorySelectionShaped(mainCategoryId, subcategoryId) ||
      !catalog.categories.resolveProductSelection(mainCategoryId, subcategoryId).valid
    ) {
      return Response.json(
        { error: 'invalidSearchCategory' },
        { status: 400, headers: corsHeaders(request) },
      );
    }
    const fields = await search.fields(mainCategoryId, subcategoryId);
    return Response.json({ fields }, { status: 200, headers: corsHeaders(request) });
  } catch (error) {
    return searchErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
