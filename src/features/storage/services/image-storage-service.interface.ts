import type {
  ImageUploadResult,
  StorageProfileClientView,
} from "@/core/storage/types/storage-profile.types";

export type ImageUploadProgressStage =
  | "profile"
  | "compressing"
  | "uploading"
  | "finalizing";
export type ImageUploadProgressCallback = (
  stage: ImageUploadProgressStage,
) => void;

/** Client-facing image storage contract (UI → ImageStorageService → API). */
export interface IImageStorageService {
  getProfile(storageProfileId: string): Promise<StorageProfileClientView>;
  processAndUpload(
    storageProfileId: string,
    file: File,
    replaceImageKey?: string | null,
    onProgress?: ImageUploadProgressCallback,
  ): Promise<ImageUploadResult>;
  deleteImage(storageProfileId: string, imageKey: string): Promise<void>;
}
