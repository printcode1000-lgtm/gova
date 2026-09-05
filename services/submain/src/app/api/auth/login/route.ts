import { assertSubmainEnv, createSubmainRuntime } from '@asol/submain-composition';
import type { LoginFormData } from '@asol/auth-core';

import { businessErrorResponse, corsHeaders, preflight, jsonResponse, readJsonBody } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Sign in. This account holds the session signing secret and the users database. */
export async function POST(request: Request): Promise<Response> {
  try {
    const { auth } = createSubmainRuntime();
    assertSubmainEnv();

    const body = await readJsonBody<LoginFormData>(request);
    const result = await auth.login(body);
    return jsonResponse(request, result, 200);
  } catch (error) {
    return businessErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
