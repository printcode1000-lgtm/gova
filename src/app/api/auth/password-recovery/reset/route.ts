import { apiSuccess, mapServiceError } from '@/core/api/api-response';
import { passwordRecoveryService } from '@/features/password-recovery/services/password-recovery-service.server';
import type { RecoveryResetInput } from '@/features/password-recovery/types';
import { runTracedBusinessRoute } from '../../traced-route';

export async function POST(request: Request) {
  return runTracedBusinessRoute('POST /api/auth/password-recovery/reset', async () => {
    try {
      const body = (await request.json()) as RecoveryResetInput;
      return apiSuccess(await passwordRecoveryService.resetPassword(body));
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
