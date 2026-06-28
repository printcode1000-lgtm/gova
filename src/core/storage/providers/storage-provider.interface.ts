import type { ImageUploadResult } from '../types/storage-profile.types';

/** Provider upload/delete contract — server-side only. */
export interface IStorageProvider {
  readonly providerId: string;

  /** Uploads bytes to the given object path and returns public URL metadata. */
  upload(objectPath: string, body: Buffer, contentType: string): Promise<{ url: string }>;

  /** Deletes an object at the given path. */
  delete(objectPath: string): Promise<void>;

  /** Resolves a public or servable URL for display. */
  resolvePublicUrl(objectPath: string): string;
}

export interface ResolvedUploadContext {
  result: ImageUploadResult;
}
