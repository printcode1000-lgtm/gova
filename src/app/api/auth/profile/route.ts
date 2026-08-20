import { apiSuccess, mapServiceError } from '@/core/api/api-response';
import { authService } from '@/features/auth/services/auth-service.bootstrap.server';
import type { UpdateProfileInput } from '@/features/auth/entities/profile.entity';
import { extractSessionToken } from '@asol/auth-core/server';
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function PUT(request: Request) {
  return runTracedBusinessRoute('PUT /api/auth/profile', async () => {
    try {
      const body = (await request.json()) as UpdateProfileInput;
      const sessionToken = extractSessionToken(request, body);
      const profile = await authService.updateProfile({ ...body, sessionToken });
      return apiSuccess(profile);
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
