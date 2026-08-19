import { apiSuccess, mapServiceError } from '@/core/api/api-response';
import { profileService } from '@/features/profile/services/profile-service.bootstrap.server';
import type { SaveStoreDetailsInput } from '@/features/profile/entities/store-details.entity';
import { runTracedBusinessRoute } from '../../auth/traced-route';

export async function GET(request: Request) {
  return runTracedBusinessRoute('GET /api/profile/store-details', async () => {
    try {
      const { searchParams } = new URL(request.url);
      const uid = searchParams.get('uid') ?? '';
      const details = await profileService.getStoreDetails(uid);
      return apiSuccess(details);
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function PUT(request: Request) {
  return runTracedBusinessRoute('PUT /api/profile/store-details', async () => {
    try {
      const body = (await request.json()) as SaveStoreDetailsInput;
      const details = await profileService.saveStoreDetails(body);
      return apiSuccess(details);
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
