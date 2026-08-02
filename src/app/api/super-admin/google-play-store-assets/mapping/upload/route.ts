import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { googlePlayStoreAssetsService } from "@/modules/google-play-console/services/google-play-store-assets-service.server";
import { runTracedBusinessRoute } from "../../../../auth/traced-route";

export async function POST(request: Request) {
  return runTracedBusinessRoute("POST /api/super-admin/google-play-store-assets/mapping/upload", async () => {
    try {
      assertSuperAdminRequest(request);
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) throw new Error("googlePlayMappingFileRequired");
      return apiSuccess(await googlePlayStoreAssetsService.uploadMapping({
        versionCode: String(form.get("versionCode") || ""),
        fileName: file.name,
        contentType: file.type || "text/plain",
        buffer: Buffer.from(await file.arrayBuffer()),
      }));
    } catch (error) {
      return mapServiceError(error);
    }
  });
}
