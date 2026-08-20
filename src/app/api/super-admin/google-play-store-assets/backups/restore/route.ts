import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { googlePlayStoreAssetsService } from "@/modules/google-play-console/services/google-play-store-assets-service.server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function POST(request: Request) {
  return runTracedBusinessRoute("POST /api/super-admin/google-play-store-assets/backups/restore", async () => {
    try {
      assertSuperAdminRequest(request);
      const body = await request.json();
      return apiSuccess(await googlePlayStoreAssetsService.restoreBackup(String(body.name || "")));
    } catch (error) {
      return mapServiceError(error);
    }
  });
}
