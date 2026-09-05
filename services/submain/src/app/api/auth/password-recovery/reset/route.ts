import { assertSubmainEnv, createSubmainRuntime } from '@asol/submain-composition';
import type { RecoveryResetInput } from '@/features/password-recovery';

import { businessErrorResponse, corsHeaders, preflight, jsonResponse, readJsonBody } from '../../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  try {
    const { passwordRecovery } = createSubmainRuntime();
    assertSubmainEnv();

    const body = await readJsonBody<RecoveryResetInput>(request);
    const result = await passwordRecovery.resetPassword(body);
    return jsonResponse(request, result, 200);
  } catch (error) {
    return businessErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
