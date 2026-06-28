import type {
  ImageUploadResult,
  StorageOutputFormat,
  StorageProfileClientView,
} from '@/core/storage/types/storage-profile.types';
import { buildUploadFilename } from '@/core/storage/output-format.registry';

/** Low-level HTTP adapter contract for image storage APIs. */
export interface IImageStorageApiAdapter {
  getProfile(storageProfileId: string): Promise<StorageProfileClientView>;
  uploadImage(
    storageProfileId: string,
    file: Blob,
    outputFormat: StorageOutputFormat,
    replaceImageKey?: string | null
  ): Promise<ImageUploadResult>;
  deleteImage(storageProfileId: string, imageKey: string): Promise<void>;
}
