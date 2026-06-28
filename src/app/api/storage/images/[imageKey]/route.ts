import { apiSuccess, mapServiceError } from '@/core/api/api-response';
import { imageStorageService } from '@/features/storage/services/image-storage-service.bootstrap.server';
import { runTracedBusinessRoute } from '../../../auth/traced-route';

export async function DELETE(
  request: Request,
  context: { params: Promise<{ imageKey: string }> }
) {
  return runTracedBusinessRoute('DELETE /api/storage/images/:imageKey', async () => {
    try {
      const { imageKey } = await context.params;
      const { searchParams } = new URL(request.url);
      const storageProfileId = searchParams.get('storageProfileId');

      if (!storageProfileId) {
        throw new Error('storageProfileId is required');
      }

      await imageStorageService.deleteImage(storageProfileId, imageKey);
      return apiSuccess({ deleted: true });
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
