import 'server-only';

import type { StorageProfile, ImageUploadResult } from '../types/storage-profile.types';
import { getStorageProfileById, assertStorageProfileEnabled } from '../profiles/storage-profile-loader.server';
import { validateImageForProfile, validateImageMimeType } from '../rules/image-rules';
import { buildObjectPath } from '../storage/image-path';
import { imageKeyGenerator } from '../storage/image-key-generator';
import { resolveActiveProviderId, resolveStorageProvider } from '../providers/provider-resolver.server';

export interface UploadImageInput {
  storageProfileId: string;
  body: Buffer;
  contentType: string;
  replaceImageKey?: string | null;
}

/**
 * Server-side image storage orchestrator.
 * Loads profile → validates → uploads via provider → optionally deletes replaced image.
 */
export class ImageStorageOrchestrator {
  /** Uploads a processed image and returns full metadata. */
  async upload(input: UploadImageInput): Promise<ImageUploadResult> {
    const profile = getStorageProfileById(input.storageProfileId);
    assertStorageProfileEnabled(profile);
    validateImageMimeType(input.contentType);
    validateImageForProfile(input.body.length, profile);

    const imageKey = imageKeyGenerator.generate(profile.outputFormat);
    const objectPath = buildObjectPath(profile.folder, imageKey);
    const provider = resolveStorageProvider(profile.provider);
    const activeProviderId = resolveActiveProviderId(profile.provider);

    const { url } = await provider.upload(objectPath, input.body, input.contentType);

    if (input.replaceImageKey) {
      await this.deleteByKey(input.storageProfileId, input.replaceImageKey);
    }

    return {
      imageKey,
      storageProfileId: profile.id,
      provider: activeProviderId,
      filePathOrProviderId: objectPath,
      url,
    };
  }

  /** Deletes an image by key using the profile folder to rebuild the object path. */
  async deleteByKey(storageProfileId: string, imageKey: string): Promise<void> {
    const profile = getStorageProfileById(storageProfileId);
    assertStorageProfileEnabled(profile);
    const objectPath = buildObjectPath(profile.folder, imageKey);
    const provider = resolveStorageProvider(profile.provider);
    await provider.delete(objectPath);
  }

  /** Resolves a display URL for an existing image key. */
  resolveUrl(storageProfileId: string, imageKey: string, knownUrl?: string): string {
    if (knownUrl) return knownUrl;
    const profile = getStorageProfileById(storageProfileId);
    const objectPath = buildObjectPath(profile.folder, imageKey);
    const provider = resolveStorageProvider(profile.provider);
    return provider.resolvePublicUrl(objectPath);
  }

  /** Returns profile by id (for API layer). */
  getProfile(profileId: string): StorageProfile {
    return getStorageProfileById(profileId);
  }
}

export const imageStorageOrchestrator = new ImageStorageOrchestrator();
