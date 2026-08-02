import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { googlePlayStoreAssetsService } from "@/modules/google-play-console/services/google-play-store-assets-service.server";
import { runTracedBusinessRoute } from "../../../../auth/traced-route";

export async function POST(request: Request) {
  return runTracedBusinessRoute("POST /api/super-admin/google-play-store-assets/listings/delete", async () => {
    try {
      assertSuperAdminRequest(request);
      const body = await request.json();
      return apiSuccess(await googlePlayStoreAssetsService.deleteListing(String(body.language || "")));
    } catch (error) {
      return mapServiceError(error);
    }
  });
}
