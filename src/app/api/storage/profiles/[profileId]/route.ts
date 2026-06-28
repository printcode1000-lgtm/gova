import { apiSuccess, mapServiceError } from '@/core/api/api-response';
import { imageStorageService } from '@/features/storage/services/image-storage-service.bootstrap.server';
import { runTracedBusinessRoute } from '../../../auth/traced-route';

export async function GET(
  _request: Request,
  context: { params: Promise<{ profileId: string }> }
) {
  return runTracedBusinessRoute('GET /api/storage/profiles/:profileId', async () => {
    try {
      const { profileId } = await context.params;
      const limits = imageStorageService.getProfile(profileId);
      return apiSuccess(limits);
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
