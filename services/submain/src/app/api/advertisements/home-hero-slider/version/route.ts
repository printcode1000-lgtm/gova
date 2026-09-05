import { assertSubmainEnv, createSubmainRuntime } from '@asol/submain-composition';

import { businessErrorResponse, corsHeaders, preflight, jsonResponse } from '../../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The version a client polls to know whether its cached surface is stale. */
export async function GET(request: Request): Promise<Response> {
  try {
    const { advertisements } = createSubmainRuntime();
    assertSubmainEnv();

    const version = await advertisements.homeHeroSlider.getVersion();
    return jsonResponse(request, version, 200);
  } catch (error) {
    return businessErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
