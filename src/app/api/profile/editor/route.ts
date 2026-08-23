import { apiSuccess, mapServiceError } from '@/core/api/api-response';
import type { SaveProfileEditorInput } from '@/features/profile';
import { profileService } from '@/features/profile/server';
import { extractSessionToken } from '@asol/auth-core/server';
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function PUT(request: Request) {
  return runTracedBusinessRoute('PUT /api/profile/editor', async () => {
    try {
      const body = (await request.json()) as SaveProfileEditorInput;
      const sessionToken = extractSessionToken(request, body);
      return apiSuccess(
        await profileService.saveEditor({ ...body, sessionToken }),
      );
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
