import { assertProductsEnv, createProductsRuntime } from '@asol/products-composition';
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
    // Layer 2. Built per request, never at module scope: module scope runs during
    // `next build`, where no account credential exists.
    const { database, catalog } = createProductsRuntime();
    assertProductsEnv();

    const q = new URL(request.url).searchParams;
    const mainCategoryId = q.get('mainCategoryId') ?? '';
    const subcategoryId = q.get('subcategoryId') ?? '';
    if (
      !SAFE_ID.test(mainCategoryId) ||
      !SAFE_ID.test(subcategoryId) ||
      !catalog.categories.resolveProductSelection(mainCategoryId, subcategoryId).valid
    ) {
      return Response.json(
        { error: 'invalidSearchCategory' },
        { status: 400, headers: corsHeaders(request) },
      );
    }
    const fields = await database.searchFields(mainCategoryId, subcategoryId);
    return Response.json({ fields }, { status: 200, headers: corsHeaders(request) });
  } catch (error) {
    return searchErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
