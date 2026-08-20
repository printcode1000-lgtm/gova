import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { googlePlayStoreAssetsService } from "@/modules/google-play-console/services/google-play-store-assets-service.server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function POST(request: Request) {
  return runTracedBusinessRoute("POST /api/super-admin/google-play-store-assets/tracks/promote", async () => {
    try {
      assertSuperAdminRequest(request);
      return apiSuccess(await googlePlayStoreAssetsService.promoteRelease(await request.json()));
    } catch (error) {
      return mapServiceError(error);
    }
  });
}
