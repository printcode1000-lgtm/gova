import { runSuperAdminRoute } from "@/features/super-admin/services/super-admin-route.server";
import { googlePlayStoreAssetsService } from "@/modules/google-play-console/services/google-play-store-assets-service.server";

export async function POST(request: Request) {
  return runSuperAdminRoute(
    "POST /api/super-admin/google-play-store-assets/mapping/upload",
    request,
    async () => {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) throw new Error("googlePlayMappingFileRequired");
      return googlePlayStoreAssetsService.uploadMapping({
        versionCode: String(form.get("versionCode") || ""),
        fileName: file.name,
        contentType: file.type || "text/plain",
        buffer: Buffer.from(await file.arrayBuffer()),
      });
    },
  );
}
