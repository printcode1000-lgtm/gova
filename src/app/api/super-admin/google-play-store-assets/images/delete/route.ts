import { runSuperAdminJsonRoute } from "@/features/super-admin/services/super-admin-route.server";
import { googlePlayStoreAssetsService } from "@/modules/google-play-console/services/google-play-store-assets-service.server";
import type { GooglePlayImageType } from "@asol/google-play-store-assets-core";

interface DeleteGooglePlayImageBody {
  language?: string;
  imageType?: string;
  imageId?: string;
}

export async function POST(request: Request) {
  return runSuperAdminJsonRoute<DeleteGooglePlayImageBody, unknown>(
    "POST /api/super-admin/google-play-store-assets/images/delete",
    request,
    ({ body }) => {
      if (!body.imageId) throw new Error("googlePlayImageIdRequired");
      return googlePlayStoreAssetsService.deleteImage({
        language: body.language || "ar",
        imageType: (body.imageType || "icon") as GooglePlayImageType,
        imageId: body.imageId,
      });
    },
  );
}
