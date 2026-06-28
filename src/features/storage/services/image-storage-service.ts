import { compressImageForProfile } from '../processing/image-processor.client';
import type { IImageStorageService } from './image-storage-service.interface';
import type { IImageStorageApiAdapter } from './image-storage-api-service.interface';
import { imageStorageApiService } from './image-storage-api-service';

/**
 * Client ImageStorageService — sits between UI and API.
 * Owns the client pipeline: load profile → compress → upload/delete via API adapter.
 */
export class ImageStorageService implements IImageStorageService {
  constructor(private api: IImageStorageApiAdapter = imageStorageApiService) {}

  getProfile(storageProfileId: string) {
    return this.api.getProfile(storageProfileId);
  }

  async processAndUpload(
    storageProfileId: string,
    file: File,
    replaceImageKey?: string | null
  ) {
    const profile = await this.api.getProfile(storageProfileId);
    const compressed = await compressImageForProfile(file, profile);
    return this.api.uploadImage(storageProfileId, compressed, replaceImageKey);
  }

  deleteImage(storageProfileId: string, imageKey: string) {
    return this.api.deleteImage(storageProfileId, imageKey);
  }
}

export const imageStorageService = new ImageStorageService();
