import { apiSuccess, mapServiceError } from '@/core/api/api-response';
import { authService } from '@/features/auth/services/auth-service.bootstrap.server';
import type { RegistrationFormData } from '@/lib/validation/auth';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegistrationFormData;
    const result = await authService.register(body);
    return apiSuccess(result);
  } catch (error) {
    return mapServiceError(error);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
