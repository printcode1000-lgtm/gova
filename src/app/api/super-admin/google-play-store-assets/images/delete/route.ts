import { runSuperAdminJsonRoute } from "@/features/super-admin/server";
import { googlePlayStoreAssetsService } from "@/features/google-play-console/server";
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
