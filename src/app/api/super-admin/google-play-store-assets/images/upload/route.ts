import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { googlePlayStoreAssetsService } from "@/modules/google-play-console/services/google-play-store-assets-service.server";
import type { GooglePlayImageType } from "@/modules/google-play-console/domain/store-assets-types";
import { runTracedBusinessRoute } from "../../../../auth/traced-route";

export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/super-admin/google-play-store-assets/images/upload",
    async () => {
      try {
        assertSuperAdminRequest(request);
        const form = await request.formData();
        const file = form.get("file");
        if (!(file instanceof File)) throw new Error("googlePlayImageFileRequired");
        return apiSuccess(
          await googlePlayStoreAssetsService.uploadImage({
            language: String(form.get("language") || "ar"),
            imageType: String(form.get("imageType") || "icon") as GooglePlayImageType,
            fileName: file.name,
            contentType: file.type,
            buffer: Buffer.from(await file.arrayBuffer()),
          }),
        );
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}
