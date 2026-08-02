import { asolApi, ASOL_API_ROUTES } from "@/core/api";
import type {
  ImageUploadResult,
  StorageOutputFormat,
  StorageProfileClientView,
} from "@/core/storage/types/storage-profile.types";
import { buildUploadFilename } from "@/core/storage/output-format.registry";
import type { IImageStorageApiAdapter } from "./image-storage-api-service.interface";

/** HTTP adapter — ImageStorageService → API only. */
export class ImageStorageApiService implements IImageStorageApiAdapter {
  async getProfile(
    storageProfileId: string,
  ): Promise<StorageProfileClientView> {
    return asolApi.get<StorageProfileClientView>(
      ASOL_API_ROUTES.storage.profile(storageProfileId),
    );
  }

  async uploadImage(
    storageProfileId: string,
    file: Blob,
    outputFormat: StorageOutputFormat,
    replaceImageKey?: string | null,
    storageScope?: string | null,
    signal?: AbortSignal,
  ): Promise<ImageUploadResult> {
    const formData = new FormData();
    formData.append("file", file, buildUploadFilename(outputFormat));
    formData.append("storageProfileId", storageProfileId);
    if (replaceImageKey) {
      formData.append("replaceImageKey", replaceImageKey);
    }
    if (storageScope) {
      formData.append("storageScope", storageScope);
    }
    return asolApi.postForm<ImageUploadResult>(
      ASOL_API_ROUTES.storage.upload,
      formData,
      { signal },
    );
  }

  async deleteImage(storageProfileId: string, imageKey: string): Promise<void> {
    const route = ASOL_API_ROUTES.storage.deleteImage(imageKey);
    await asolApi.delete<void>(
      `${route}?storageProfileId=${encodeURIComponent(storageProfileId)}`,
    );
  }
}

export const imageStorageApiService = new ImageStorageApiService();
