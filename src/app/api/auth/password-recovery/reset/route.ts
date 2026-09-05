import { apiSuccess, mapServiceError, readJsonBody } from '@/core/api/api-response';
import { passwordRecoveryService } from '@/features/password-recovery/server';
import type { RecoveryResetInput } from '@/features/password-recovery';
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function POST(request: Request) {
  return runTracedBusinessRoute('POST /api/auth/password-recovery/reset', async () => {
    try {
      const body = (await readJsonBody<unknown>(request)) as RecoveryResetInput;
      return apiSuccess(await passwordRecoveryService.resetPassword(body));
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
