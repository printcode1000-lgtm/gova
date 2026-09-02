import { assertSubmainEnv, createSubmainRuntime } from '@asol/submain-composition';
import type { RecoveryRequestInput } from '@/features/password-recovery';

import { businessErrorResponse, corsHeaders, preflight } from '../../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Request a recovery code. The caller's IP is what the rate limiter counts. */
export async function POST(request: Request): Promise<Response> {
  try {
    const { passwordRecovery } = createSubmainRuntime();
    assertSubmainEnv();

    const body = (await request.json()) as RecoveryRequestInput;
    const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const result = await passwordRecovery.requestCode(body, forwarded ?? 'unknown');
    return Response.json(result, { status: 200, headers: corsHeaders(request) });
  } catch (error) {
    return businessErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
