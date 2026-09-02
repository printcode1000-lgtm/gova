import { assertSubmainEnv, createSubmainRuntime } from '@asol/submain-composition';
import type { RecoveryResetInput } from '@/features/password-recovery';

import { businessErrorResponse, corsHeaders, preflight } from '../../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  try {
    const { passwordRecovery } = createSubmainRuntime();
    assertSubmainEnv();

    const body = (await request.json()) as RecoveryResetInput;
    const result = await passwordRecovery.resetPassword(body);
    return Response.json(result, { status: 200, headers: corsHeaders(request) });
  } catch (error) {
    return businessErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
