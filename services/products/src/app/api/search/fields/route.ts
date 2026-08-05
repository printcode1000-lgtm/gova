import { categoryService } from '@/features/categories';
import { getEnabledProductSearchFields } from '@/features/product-search/services/product-search-fields.server';
import { corsHeaders, preflight, searchErrorResponse } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SAFE_ID = /^\d+$/;

/**
 * Which search fields a category exposes.
 *
 * Categories come from JSON inside the bundle, not a database, so this needs no
 * credentials beyond what the product query already uses.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const q = new URL(request.url).searchParams;
    const mainCategoryId = q.get('mainCategoryId') ?? '';
    const subcategoryId = q.get('subcategoryId') ?? '';
    if (
      !SAFE_ID.test(mainCategoryId) ||
      !SAFE_ID.test(subcategoryId) ||
      !categoryService.resolveLegacyProductSelection(mainCategoryId, subcategoryId).valid
    ) {
      return Response.json(
        { error: 'invalidSearchCategory' },
        { status: 400, headers: corsHeaders(request) },
      );
    }
    const fields = await getEnabledProductSearchFields(mainCategoryId, subcategoryId);
    return Response.json({ fields }, { status: 200, headers: corsHeaders(request) });
  } catch (error) {
    return searchErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
