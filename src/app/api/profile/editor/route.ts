import { apiSuccess, mapServiceError } from '@/core/api/api-response';
import type { SaveProfileEditorInput } from '@/features/profile/entities/profile-editor.entity';
import { profileService } from '@/features/profile/services/profile-service.bootstrap.server';
import { runTracedBusinessRoute } from '../../auth/traced-route';

export async function PUT(request: Request) {
  return runTracedBusinessRoute('PUT /api/profile/editor', async () => {
    try {
      const body = (await request.json()) as SaveProfileEditorInput;
      return apiSuccess(await profileService.saveEditor(body));
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
