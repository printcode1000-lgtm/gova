import { apiSuccess, mapServiceError } from '@/core/api/api-response';
import { authService } from '@/features/auth/services/auth-service.bootstrap.server';
import type { LoginFormData } from '@/lib/validation/auth';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginFormData;
    const result = await authService.login(body);
    return apiSuccess(result);
  } catch (error) {
    return mapServiceError(error);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
