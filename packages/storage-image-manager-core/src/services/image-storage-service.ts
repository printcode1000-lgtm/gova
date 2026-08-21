import { compressImageForProfile } from "../processing/image-processor.client";
import type {
  IImageStorageService,
  ImageUploadProgressCallback,
} from "./image-storage-service.interface";
import type { IImageStorageApiAdapter } from "./image-storage-api-service.interface";

let configuredImageStorageApiAdapter: IImageStorageApiAdapter | null = null;

export function configureImageStorageApiAdapter(
  adapter: IImageStorageApiAdapter,
) {
  configuredImageStorageApiAdapter = adapter;
}

function getConfiguredImageStorageApiAdapter(): IImageStorageApiAdapter {
  if (!configuredImageStorageApiAdapter) {
    throw new Error("Image storage API adapter is not configured");
  }
  return configuredImageStorageApiAdapter;
}

/**
 * Client ImageStorageService — sole public client entry point.
 * UI → ImageStorageService → ImageStorageApiService → API
 */
export class ImageStorageService implements IImageStorageService {
  constructor(private api?: IImageStorageApiAdapter) {}

  getProfile(storageProfileId: string) {
    return (this.api ?? getConfiguredImageStorageApiAdapter()).getProfile(
      storageProfileId,
    );
  }

  async processAndUpload(
    storageProfileId: string,
    file: File,
    replaceImageKey?: string | null,
    onProgress?: ImageUploadProgressCallback,
    storageScope?: string | null,
    signal?: AbortSignal,
  ) {
    if (signal?.aborted) throw signal.reason;
    onProgress?.("profile");
    const api = this.api ?? getConfiguredImageStorageApiAdapter();
    const profile = await api.getProfile(storageProfileId);
    if (signal?.aborted) throw signal.reason;
    onProgress?.("compressing");
    const compressed = await compressImageForProfile(file, profile);
    if (signal?.aborted) throw signal.reason;
    onProgress?.("uploading");
    const result = await api.uploadImage(
      storageProfileId,
      compressed,
      profile.outputFormat,
      replaceImageKey,
      storageScope,
      signal,
    );
    if (signal?.aborted) throw signal.reason;
    onProgress?.("finalizing");
    return result;
  }

  deleteImage(storageProfileId: string, imageKey: string) {
    return (this.api ?? getConfiguredImageStorageApiAdapter()).deleteImage(
      storageProfileId,
      imageKey,
    );
  }
}

export const imageStorageService = new ImageStorageService();
