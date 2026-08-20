import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { googlePlayStoreAssetsService } from "@/modules/google-play-console/services/google-play-store-assets-service.server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function GET(request: Request) {
  return runTracedBusinessRoute("GET /api/super-admin/google-play-store-assets/backups", async () => {
    try {
      assertSuperAdminRequest(request);
      return apiSuccess(await googlePlayStoreAssetsService.listBackups());
    } catch (error) {
      return mapServiceError(error);
    }
  });
}
