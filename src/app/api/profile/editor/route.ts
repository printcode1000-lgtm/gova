import { apiSuccess, mapServiceError, readJsonBody } from '@/core/api/api-response';
import type { SaveProfileEditorInput } from '@/features/profile';
import { profileService } from '@/features/profile/server';
import { extractSessionToken } from '@asol/auth-core/server';
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function PUT(request: Request) {
  return runTracedBusinessRoute('PUT /api/profile/editor', async () => {
    try {
      const body = (await readJsonBody<unknown>(request)) as SaveProfileEditorInput;
      const sessionToken = extractSessionToken(request, body);
      return apiSuccess(
        await profileService.saveEditor({
          uid: body.uid,
          sessionToken,
          changedSections: body.changedSections,
          registration: body.registration,
          contacts: body.contacts,
          storeDetails: body.storeDetails,
          specialties: body.specialties,
        }),
      );
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
