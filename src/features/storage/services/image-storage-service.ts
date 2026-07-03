import { compressImageForProfile } from "../processing/image-processor.client";
import type {
  IImageStorageService,
  ImageUploadProgressCallback,
} from "./image-storage-service.interface";
import type { IImageStorageApiAdapter } from "./image-storage-api-service.interface";
import { imageStorageApiService } from "./image-storage-api-service";

/**
 * Client ImageStorageService — sole public client entry point.
 * UI → ImageStorageService → ImageStorageApiService → API
 */
export class ImageStorageService implements IImageStorageService {
  constructor(private api: IImageStorageApiAdapter = imageStorageApiService) {}

  getProfile(storageProfileId: string) {
    return this.api.getProfile(storageProfileId);
  }

  async processAndUpload(
    storageProfileId: string,
    file: File,
    replaceImageKey?: string | null,
    onProgress?: ImageUploadProgressCallback,
    storageScope?: string | null,
  ) {
    onProgress?.("profile");
    console.info(
      `[StorageImageManager:${storageProfileId}] profile-request-start`,
    );
    const profile = await this.api.getProfile(storageProfileId);
    console.info(`[StorageImageManager:${storageProfileId}] profile-received`, {
      enabled: profile.enabled,
      maxImageSizeKB: profile.maxImageSizeKB,
      outputFormat: profile.outputFormat,
    });
    onProgress?.("compressing");
    const compressed = await compressImageForProfile(file, profile);
    console.info(`[StorageImageManager:${storageProfileId}] api-upload-start`, {
      compressedBytes: compressed.size,
      compressedType: compressed.type,
      replaceImageKey: replaceImageKey ?? null,
    });
    onProgress?.("uploading");
    const result = await this.api.uploadImage(
      storageProfileId,
      compressed,
      profile.outputFormat,
      replaceImageKey,
      storageScope,
    );
    onProgress?.("finalizing");
    console.info(
      `[StorageImageManager:${storageProfileId}] api-upload-completed`,
      {
        imageKey: result.imageKey,
        provider: result.provider,
      },
    );
    return result;
  }

  deleteImage(storageProfileId: string, imageKey: string) {
    return this.api.deleteImage(storageProfileId, imageKey);
  }
}

export const imageStorageService = new ImageStorageService();
