import { assertSubmainEnv, createSubmainRuntime } from '@asol/submain-composition';
import { isSearchCategorySelectionShaped } from '@/features/product-search/domain/product-search.request';

import { corsHeaders, preflight, searchErrorResponse, jsonResponse } from '../../../lib/http';

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
      return jsonResponse(request, { error: 'invalidSearchCategory' }, 400);
    }
    const fields = await search.fields(mainCategoryId, subcategoryId);
    return jsonResponse(request, { fields }, 200);
  } catch (error) {
    return searchErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
