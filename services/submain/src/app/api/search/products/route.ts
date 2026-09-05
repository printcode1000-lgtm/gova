import { assertSubmainEnv, createSubmainRuntime } from '@asol/submain-composition';
import { parseProductSearchRequest } from '@/features/product-search/domain/product-search.request';

import { corsHeaders, preflight, searchErrorResponse, jsonResponse } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  try {
    const { search } = createSubmainRuntime();
    assertSubmainEnv();

    // The request shape is parsed by the same function the main application uses. Two parsers
    // for one URL is two answers to the same query, and nothing would report the difference.
    const data = await search.products(parseProductSearchRequest(new URL(request.url).searchParams));
    return jsonResponse(request, data, 200);
  } catch (error) {
    return searchErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
