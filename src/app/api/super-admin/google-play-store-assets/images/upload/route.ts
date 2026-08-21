import { runSuperAdminRoute } from "@/features/super-admin/services/super-admin-route.server";
import { googlePlayStoreAssetsService } from "@/modules/google-play-console/services/google-play-store-assets-service.server";
import type { GooglePlayImageType } from "@asol/google-play-store-assets-core";

export async function POST(request: Request) {
  return runSuperAdminRoute(
    "POST /api/super-admin/google-play-store-assets/images/upload",
    request,
    async () => {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) throw new Error("googlePlayImageFileRequired");
      return googlePlayStoreAssetsService.uploadImage({
        language: String(form.get("language") || "ar"),
        imageType: String(form.get("imageType") || "icon") as GooglePlayImageType,
        fileName: file.name,
        contentType: file.type,
        buffer: Buffer.from(await file.arrayBuffer()),
      });
    },
  );
}
