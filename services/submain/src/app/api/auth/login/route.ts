import { assertSubmainEnv, createSubmainRuntime } from '@asol/submain-composition';
import type { LoginFormData } from '@asol/auth-core';

import { businessErrorResponse, corsHeaders, preflight } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Sign in. This account holds the session signing secret and the users database. */
export async function POST(request: Request): Promise<Response> {
  try {
    const { auth } = createSubmainRuntime();
    assertSubmainEnv();

    const body = (await request.json()) as LoginFormData;
    const result = await auth.login(body);
    return Response.json(result, { status: 200, headers: corsHeaders(request) });
  } catch (error) {
    return businessErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
