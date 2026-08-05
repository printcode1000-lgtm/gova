import { productService } from '@/features/product/services/product-service.server';
import { corsHeaders, errorResponse, preflight } from '../../lib/http';

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
    const searchParams = new URL(request.url).searchParams;
    const id = searchParams.get('id');
    const data = id
      ? await productService.get(id)
      : await productService.listByOwnerAndCategory(
          searchParams.get('uid') ?? '',
          searchParams.get('mainCategoryId') ?? '',
          searchParams.get('subcategoryId') ?? '',
        );
    return Response.json(data, { status: 200, headers: corsHeaders(request) });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
