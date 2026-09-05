import { assertSubmainEnv, createSubmainRuntime } from '@asol/submain-composition';
import { isValidPhone } from '@asol/auth-core/server';

import { checkPhoneErrorResponse, corsHeaders, preflight, jsonResponse } from '../../../lib/http';

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
      return jsonResponse(request, { error: 'invalidPhone' }, 400);
    }

    const result = await auth.checkPhone(phone);
    return jsonResponse(request, result, 200);
  } catch (error) {
    return checkPhoneErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
