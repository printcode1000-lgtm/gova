import { apiSuccess, mapServiceError } from '@/core/api/api-response';
import { authService } from '@/features/auth/services/auth-service.bootstrap.server';
import type { UpdateProfileInput } from '@/features/auth/entities/profile.entity';
import { runTracedBusinessRoute } from '../traced-route';

export async function PUT(request: Request) {
  return runTracedBusinessRoute('PUT /api/auth/profile', async () => {
    try {
      const body = (await request.json()) as UpdateProfileInput;
      const profile = await authService.updateProfile(body);
      return apiSuccess(profile);
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
