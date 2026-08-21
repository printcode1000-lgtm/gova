import {
  type ImageUploadResult,
  type StorageOutputFormat,
  type StorageProfileClientView,
  buildUploadFilename,
} from "@asol/storage-core";

/** Low-level HTTP adapter contract for image storage APIs. */
export interface IImageStorageApiAdapter {
  getProfile(storageProfileId: string): Promise<StorageProfileClientView>;
  uploadImage(
    storageProfileId: string,
    file: Blob,
    outputFormat: StorageOutputFormat,
    replaceImageKey?: string | null,
    storageScope?: string | null,
    signal?: AbortSignal,
  ): Promise<ImageUploadResult>;
  deleteImage(storageProfileId: string, imageKey: string): Promise<void>;
}
