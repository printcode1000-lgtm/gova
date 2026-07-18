import { apiSuccess, mapServiceError } from '@/core/api/api-response';
import { passwordRecoveryService } from '@/features/password-recovery/services/password-recovery-service.server';
import type { RecoveryVerifyInput } from '@/features/password-recovery/types';
import { runTracedBusinessRoute } from '../../traced-route';

export async function POST(request: Request) {
  return runTracedBusinessRoute('POST /api/auth/password-recovery/verify', async () => {
    try {
      const body = (await request.json()) as RecoveryVerifyInput;
      return apiSuccess(await passwordRecoveryService.verifyCode(body));
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
