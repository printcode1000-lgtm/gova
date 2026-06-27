import { apiSuccess, mapServiceError } from '@/core/api/api-response';
import { authService } from '@/features/auth/services/auth-service.bootstrap.server';
import { runTracedBusinessRoute } from '../traced-route';

export async function POST() {
  return runTracedBusinessRoute('POST /api/auth/logout', async () => {
    try {
      await authService.logout();
      return apiSuccess({ ok: true });
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
