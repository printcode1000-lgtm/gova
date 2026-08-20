import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { googlePlayStoreAssetsService } from "@/modules/google-play-console/services/google-play-store-assets-service.server";
import type { GooglePlayImageType } from "@/modules/google-play-console/domain/store-assets-types";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/super-admin/google-play-store-assets/images/delete",
    async () => {
      try {
        assertSuperAdminRequest(request);
        const body = (await request.json()) as {
          language?: string;
          imageType?: string;
          imageId?: string;
        };
        if (!body.imageId) throw new Error("googlePlayImageIdRequired");
        return apiSuccess(
          await googlePlayStoreAssetsService.deleteImage({
            language: body.language || "ar",
            imageType: (body.imageType || "icon") as GooglePlayImageType,
            imageId: body.imageId,
          }),
        );
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}
