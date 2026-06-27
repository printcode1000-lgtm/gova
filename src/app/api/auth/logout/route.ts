import { apiSuccess, mapServiceError } from '@/core/api/api-response';
import { authService } from '@/features/auth/services/auth-service.bootstrap.server';

export async function POST() {
  try {
    await authService.logout();
    return apiSuccess({ ok: true });
  } catch (error) {
    return mapServiceError(error);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
