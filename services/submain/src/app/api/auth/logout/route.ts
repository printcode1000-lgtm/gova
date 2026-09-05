import { assertSubmainEnv, createSubmainRuntime } from '@asol/submain-composition';

import { businessErrorResponse, corsHeaders, preflight, jsonResponse } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  try {
    const { auth } = createSubmainRuntime();
    assertSubmainEnv();

    await auth.logout();
    return jsonResponse(request, { ok: true }, 200);
  } catch (error) {
    return businessErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
