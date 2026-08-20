import { assertSubmainEnv, createSubmainRuntime } from '@asol/submain-composition';
import { parseSellerSearchRequest } from '@/features/product-search/entities/product-search.request';

import { corsHeaders, preflight, searchErrorResponse } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  try {
    const { search } = createSubmainRuntime();
    assertSubmainEnv();

    const data = await search.sellers(parseSellerSearchRequest(new URL(request.url).searchParams));
    return Response.json(data, { status: 200, headers: corsHeaders(request) });
  } catch (error) {
    return searchErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
