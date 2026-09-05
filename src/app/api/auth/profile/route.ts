import { apiSuccess, mapServiceError, readJsonBody } from '@/core/api/api-response';
import { authService } from '@/features/auth/server';
import type { UpdateProfileInput } from '@/features/auth';
import { extractSessionToken } from '@asol/auth-core/server';
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function PUT(request: Request) {
  return runTracedBusinessRoute('PUT /api/auth/profile', async () => {
    try {
      const body = (await readJsonBody<unknown>(request)) as UpdateProfileInput;
      const sessionToken = extractSessionToken(request, body);
      const profile = await authService.updateProfile({
        uid: body.uid,
        phone: body.phone,
        email: body.email,
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
        sessionToken,
      });
      return apiSuccess(profile);
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
