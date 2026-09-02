import { assertSubmainEnv, createSubmainRuntime } from '@asol/submain-composition';
import { isValidPhone } from '@asol/auth-core/server';

import { businessErrorResponse, corsHeaders, preflight } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Registration uniqueness check.
 *
 * The phone domain owns what a number is; the route only refuses what it could
 * never look up. Same guard, same code, same status as the application.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const { auth } = createSubmainRuntime();
    assertSubmainEnv();

    const phone = new URL(request.url).searchParams.get('phone')?.trim() ?? '';
    if (!isValidPhone(phone)) {
      return Response.json({ error: 'invalidPhone' }, { status: 400, headers: corsHeaders(request) });
    }

    const result = await auth.checkPhone(phone);
    return Response.json(result, { status: 200, headers: corsHeaders(request) });
  } catch (error) {
    return businessErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
