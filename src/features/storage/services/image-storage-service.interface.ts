import type { ImageUploadResult, StorageProfileClientView } from '@/core/storage/types/storage-profile.types';

/** Client-facing storage service contract. */
export interface IImageStorageService {
  getProfileLimits(storageProfileId: string): Promise<StorageProfileClientView>;
  uploadImage(
    storageProfileId: string,
    file: Blob,
    replaceImageKey?: string | null
  ): Promise<ImageUploadResult>;
  deleteImage(storageProfileId: string, imageKey: string): Promise<void>;
}
