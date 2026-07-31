import type { ImageUploadResult } from '../types/storage-profile.types';

export interface StorageObjectEntry {
  path: string;
  updatedAt?: string;
}

/** Provider upload/delete contract — server-side only. */
export interface IStorageProvider {
  readonly providerId: string;

  /** Uploads bytes to the given object path and returns public URL metadata. */
  upload(objectPath: string, body: Buffer, contentType: string): Promise<{ url: string }>;

  /** Deletes an object at the given path. */
  delete(objectPath: string): Promise<void>;

  /** Checks whether an object exists in this exact storage target. */
  exists(objectPath: string): Promise<boolean>;

  /** Resolves a public or servable URL for display. */
  resolvePublicUrl(objectPath: string): string;

  /** Lists all object paths under a prefix for integrity checks. */
  list(prefix: string): Promise<StorageObjectEntry[]>;
}

export interface ResolvedUploadContext {
  result: ImageUploadResult;
}
