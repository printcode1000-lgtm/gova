import { assertProductsEnv, createProductsRuntime } from '@asol/products-composition';
import { corsHeaders, errorResponse, preflight, jsonResponse } from '../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Product reads.
 *
 * Only `GET` lives here. Creating, updating, and deleting a product also
 * rewrites denormalised counts in the *profiles* database — see
 * `product-repository.syncProfileProductCounts` — and this deployment has no
 * profile credentials by design. Writes therefore stay on the main app, and the
 * browser bridge routes them there.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    // Layer 2. Built per request, never at module scope: module scope runs during
    // `next build`, where no account credential exists.
    const { database } = createProductsRuntime();
    assertProductsEnv();

    const searchParams = new URL(request.url).searchParams;
    const id = searchParams.get('id');
    const data = id
      ? await database.products.get(id)
      : await database.products.listByOwnerAndCategory(
          searchParams.get('uid') ?? '',
          searchParams.get('mainCategoryId') ?? '',
          searchParams.get('subcategoryId') ?? '',
        );
    return jsonResponse(request, data, 200);
  } catch (error) {
    return errorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
