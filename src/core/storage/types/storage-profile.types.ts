/** Supported storage provider identifiers (server-side only). */
export type StorageProviderId = 'CloudflareR2' | 'LocalStorage' | 'GoogleDrive';

/** Storage Profile — contract between UI (profile id only) and the storage system. */
export interface StorageProfile {
  id: string;
  maxImageSizeKB: number;
  provider: StorageProviderId;
  folder: string;
}

/** Client-safe subset returned by the storage profile API (no provider/folder). */
export interface StorageProfileClientView {
  id: string;
  maxImageSizeKB: number;
}

/** Metadata persisted alongside an entity image reference. */
export interface ImageAssetMetadata {
  imageKey: string;
  storageProfileId: string;
  provider: StorageProviderId;
  filePathOrProviderId: string;
}

/** Upload API response — includes display URL for the client. */
export interface ImageUploadResult extends ImageAssetMetadata {
  url: string;
}

/** Google Drive extension point (not implemented). */
export interface GoogleDriveLocation {
  folderId: string;
  fileId: string;
}
