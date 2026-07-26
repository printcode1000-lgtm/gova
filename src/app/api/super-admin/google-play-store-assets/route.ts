import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { googlePlayStoreAssetsService } from "@/modules/google-play-console/services/google-play-store-assets-service.server";
import { runTracedBusinessRoute } from "../../auth/traced-route";

export async function GET(request: Request) {
  return runTracedBusinessRoute(
    "GET /api/super-admin/google-play-store-assets",
    async () => {
      try {
        assertSuperAdminRequest(request);
        return apiSuccess(await googlePlayStoreAssetsService.snapshot());
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}

export async function PUT(request: Request) {
  return runTracedBusinessRoute(
    "PUT /api/super-admin/google-play-store-assets",
    async () => {
      try {
        assertSuperAdminRequest(request);
        return apiSuccess(
          await googlePlayStoreAssetsService.updateText(await request.json()),
        );
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}
