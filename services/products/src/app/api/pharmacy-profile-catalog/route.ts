import { assertProductsEnv, createProductsRuntime } from '@asol/products-composition';
import { corsHeaders, preflight, searchErrorResponse } from '../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Pharmacy catalogue view.
 *
 * The override tables it reads (`pharmacy_profile_*_overrides`) live in the
 * product database, so the read belongs here. Writes stay on the main app: they
 * go through the same product repository that also rewrites profile counts.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    // Layer 2. Built per request, never at module scope: module scope runs during
    // `next build`, where no account credential exists.
    const { database } = createProductsRuntime();
    assertProductsEnv();

    const uid = (new URL(request.url).searchParams.get('uid') ?? '').trim().slice(0, 200);
    if (!uid) {
      return Response.json(
        { error: 'uid is required' },
        { status: 400, headers: corsHeaders(request) },
      );
    }
    const includeHidden = new URL(request.url).searchParams.get('includeHidden') === 'true';
    const data = await database.pharmacyProfileCatalog.getCatalogView(uid, includeHidden);
    return Response.json(data, { status: 200, headers: corsHeaders(request) });
  } catch (error) {
    return searchErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
