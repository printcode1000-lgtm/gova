import { assertSubmainEnv, createSubmainRuntime } from '@asol/submain-composition';
import { parseProductSearchRequest } from '@/features/product-search/entities/product-search.request';

import { corsHeaders, preflight, searchErrorResponse } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  try {
    const { search } = createSubmainRuntime();
    assertSubmainEnv();

    // The request shape is parsed by the same function the main application uses. Two parsers
    // for one URL is two answers to the same query, and nothing would report the difference.
    const data = await search.products(parseProductSearchRequest(new URL(request.url).searchParams));
    return Response.json(data, { status: 200, headers: corsHeaders(request) });
  } catch (error) {
    return searchErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
