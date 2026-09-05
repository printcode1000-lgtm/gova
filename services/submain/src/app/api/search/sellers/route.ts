import { assertSubmainEnv, createSubmainRuntime } from '@asol/submain-composition';
import { parseSellerSearchRequest } from '@/features/product-search/domain/product-search.request';

import { corsHeaders, preflight, searchErrorResponse, jsonResponse } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  try {
    const { search } = createSubmainRuntime();
    assertSubmainEnv();

    const data = await search.sellers(parseSellerSearchRequest(new URL(request.url).searchParams));
    return jsonResponse(request, data, 200);
  } catch (error) {
    return searchErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
