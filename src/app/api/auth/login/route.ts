import { apiSuccess, mapServiceError, readJsonBody } from '@/core/api/api-response';
import { authService } from '@/features/auth/services/auth-service.bootstrap.server';
import type { LoginFormData } from '@asol/auth-core';
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function POST(request: Request) {
  return runTracedBusinessRoute('POST /api/auth/login', async () => {
    try {
      const body = await readJsonBody<LoginFormData>(request);
      const result = await authService.login(body);
      return apiSuccess(result);
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
