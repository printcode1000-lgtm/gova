import 'server-only';

import type { StorageProfile, ImageUploadResult } from '../types/storage-profile.types';
import { getStorageProfileById, assertStorageProfileEnabled } from '../profiles/storage-profile-loader.server';
import { assertProcessedImageMatchesProfile } from '../processing/image-processor.server';
import { buildObjectPath } from '../storage/image-path';
import { imageKeyGenerator } from '../storage/image-key-generator';
import { resolveActiveProviderId, resolveStorageProvider } from '../providers/provider-resolver.server';
import { getMimeTypeForOutputFormat } from '../output-format.registry';

export interface UploadImageInput {
  storageProfileId: string;
  body: Buffer;
  contentType: string;
  replaceImageKey?: string | null;
}

/**
 * Storage Layer — resolves provider and executes upload/delete.
 * Provider selection happens only here.
 */
export class ImageStorageOrchestrator {
  async upload(input: UploadImageInput): Promise<ImageUploadResult> {
    const profile = getStorageProfileById(input.storageProfileId);
    assertStorageProfileEnabled(profile);

    const expectedMime = getMimeTypeForOutputFormat(profile.outputFormat);
    const contentType = input.contentType || expectedMime;
    assertProcessedImageMatchesProfile(input.body, contentType, profile);

    const imageKey = imageKeyGenerator.generate(profile.outputFormat);
    const objectPath = buildObjectPath(profile.folder, imageKey);
    const provider = resolveStorageProvider(profile.provider);
    const activeProviderId = resolveActiveProviderId(profile.provider);

    const { url } = await provider.upload(objectPath, input.body, contentType);

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

  async deleteByKey(storageProfileId: string, imageKey: string): Promise<void> {
    const profile = getStorageProfileById(storageProfileId);
    assertStorageProfileEnabled(profile);
    const objectPath = buildObjectPath(profile.folder, imageKey);
    const provider = resolveStorageProvider(profile.provider);
    await provider.delete(objectPath);
  }

  resolveUrl(storageProfileId: string, imageKey: string, knownUrl?: string): string {
    if (knownUrl) return knownUrl;
    const profile = getStorageProfileById(storageProfileId);
    const objectPath = buildObjectPath(profile.folder, imageKey);
    const provider = resolveStorageProvider(profile.provider);
    return provider.resolvePublicUrl(objectPath);
  }

  getProfile(profileId: string): StorageProfile {
    return getStorageProfileById(profileId);
  }
}

export const imageStorageOrchestrator = new ImageStorageOrchestrator();
