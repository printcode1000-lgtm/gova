/** Supported storage provider identifiers (server-side only). */
export type StorageProviderId = 'CloudflareR2' | 'LocalStorage' | 'GoogleDrive';

/** Output format for processed uploads (client + server). */
export type StorageOutputFormat = 'webp';

/** Storage Profile — full server config from storage-profiles.json. */
export interface StorageProfile {
  id: string;
  maxImageSizeKB: number;
  outputFormat: StorageOutputFormat;
  enabled: boolean;
  provider: StorageProviderId;
  folder: string;
}

/**
 * Client-safe storage profile — returned by GET /api/storage/profiles/:id.
 * Excludes provider, folder, and other server-only fields.
 */
export interface StorageProfileClientView {
  id: string;
  maxImageSizeKB: number;
  outputFormat: StorageOutputFormat;
  enabled: boolean;
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
