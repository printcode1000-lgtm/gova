import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { getMimeTypeForOutputFormat } from "@/core/storage/output-format.registry";
import { imageStorageService } from "@/features/storage/services/image-storage-service.bootstrap.server";
import { runTracedBusinessRoute } from "../../../auth/traced-route";

export async function POST(request: Request) {
  return runTracedBusinessRoute("POST /api/storage/images/upload", async () => {
    try {
      console.info("[StorageImageManager:server] upload-request-received");
      const formData = await request.formData();
      const file = formData.get("file");
      const storageProfileId = formData.get("storageProfileId");
      const replaceImageKey = formData.get("replaceImageKey");

      if (!(file instanceof Blob)) {
        throw new Error("file is required");
      }
      if (typeof storageProfileId !== "string" || !storageProfileId) {
        throw new Error("storageProfileId is required");
      }

      const profile = imageStorageService.getProfile(storageProfileId);
      const buffer = Buffer.from(await file.arrayBuffer());
      const contentType =
        file.type || getMimeTypeForOutputFormat(profile.outputFormat);
      console.info("[StorageImageManager:server] upload-request-validated", {
        storageProfileId,
        bytes: buffer.length,
        contentType,
        replacing: Boolean(replaceImageKey),
      });

      const result = await imageStorageService.upload({
        storageProfileId,
        body: buffer,
        contentType,
        replaceImageKey:
          typeof replaceImageKey === "string" && replaceImageKey
            ? replaceImageKey
            : null,
      });

      console.info("[StorageImageManager:server] storage-write-completed", {
        storageProfileId,
        imageKey: result.imageKey,
        provider: result.provider,
      });

      return apiSuccess(result);
    } catch (error) {
      console.error(
        "[StorageImageManager:server] upload-request-failed",
        error,
      );
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
