import { apiSuccess, mapServiceError } from '@/core/api/api-response';
import { profileService } from '@/features/profile/services/profile-service.bootstrap.server';
import type { SaveStoreImagesInput } from '@/features/profile/entities/store-images.entity';
import { runTracedBusinessRoute } from '../../auth/traced-route';

export async function GET(request: Request) {
  return runTracedBusinessRoute('GET /api/profile/store-images', async () => {
    try {
      const { searchParams } = new URL(request.url);
      const uid = searchParams.get('uid') ?? '';
      const images = await profileService.getStoreImages(uid);
      return apiSuccess(images);
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function PUT(request: Request) {
  return runTracedBusinessRoute('PUT /api/profile/store-images', async () => {
    try {
      const body = (await request.json()) as SaveStoreImagesInput;
      const images = await profileService.saveStoreImages(body);
      return apiSuccess(images);
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
