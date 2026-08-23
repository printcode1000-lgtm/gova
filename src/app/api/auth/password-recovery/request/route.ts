import { apiSuccess, mapServiceError } from '@/core/api/api-response';
import { passwordRecoveryService } from '@/features/password-recovery/server';
import type { RecoveryRequestInput } from '@/features/password-recovery';
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function POST(request: Request) {
  return runTracedBusinessRoute('POST /api/auth/password-recovery/request', async () => {
    try {
      const body = (await request.json()) as RecoveryRequestInput;
      const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
      const result = await passwordRecoveryService.requestCode(body, forwarded ?? 'unknown');
      return apiSuccess(result);
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
