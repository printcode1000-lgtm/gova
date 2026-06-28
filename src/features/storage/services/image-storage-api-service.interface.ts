import type {
  ImageUploadResult,
  StorageProfileClientView,
} from '@/core/storage/types/storage-profile.types';

/** Low-level HTTP adapter contract for image storage APIs. */
export interface IImageStorageApiAdapter {
  getProfile(storageProfileId: string): Promise<StorageProfileClientView>;
  uploadImage(
    storageProfileId: string,
    file: Blob,
    replaceImageKey?: string | null
  ): Promise<ImageUploadResult>;
  deleteImage(storageProfileId: string, imageKey: string): Promise<void>;
}
