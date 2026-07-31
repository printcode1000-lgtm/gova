import "server-only";

import type {
  StorageProfile,
  ImageUploadResult,
} from "../types/storage-profile.types";
import {
  getStorageProfileById,
  assertStorageProfileEnabled,
} from "../profiles/storage-profile-loader.server";
import { assertProcessedImageMatchesProfile } from "../processing/image-processor.server";
import { buildObjectPath } from "../storage/image-path";
import { imageKeyGenerator } from "../storage/image-key-generator";
import {
  resolveActiveProviderId,
  resolveStorageProvider,
} from "../providers/provider-resolver.server";
import { storageFolderForProvider } from "./storage-profile-path";
import { getMimeTypeForOutputFormat } from "../output-format.registry";
import type { StorageObjectEntry } from "../providers/storage-provider.interface";

export interface UploadImageInput {
  storageProfileId: string;
  body: Buffer;
  contentType: string;
  storageScope?: string | null;
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

    const generatedKey = imageKeyGenerator.generate(profile.outputFormat);
    const imageKey = this.resolveImageKey(
      profile,
      generatedKey,
      input.storageScope,
    );
    const activeProviderId = resolveActiveProviderId(profile.provider);
    const objectPath = buildObjectPath(
      storageFolderForProvider(profile, activeProviderId),
      imageKey,
    );
    const provider = resolveStorageProvider(profile.provider);

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
    const objectPath = this.resolveObjectPath(storageProfileId, imageKey);
    const provider = resolveStorageProvider(profile.provider);
    await provider.delete(objectPath);
  }

  resolveUrl(
    storageProfileId: string,
    imageKey: string,
    _knownUrl?: string,
  ): string {
    const profile = getStorageProfileById(storageProfileId);
    const objectPath = this.resolveObjectPath(storageProfileId, imageKey);
    const provider = resolveStorageProvider(profile.provider);
    return provider.resolvePublicUrl(objectPath);
  }

  getProfile(profileId: string): StorageProfile {
    return getStorageProfileById(profileId);
  }

  resolveObjectPath(storageProfileId: string, imageKey: string): string {
    const profile = getStorageProfileById(storageProfileId);
    const activeProviderId = resolveActiveProviderId(profile.provider);
    return buildObjectPath(
      storageFolderForProvider(profile, activeProviderId),
      imageKey,
    );
  }

  async listByProfile(storageProfileId: string): Promise<StorageObjectEntry[]> {
    const profile = getStorageProfileById(storageProfileId);
    assertStorageProfileEnabled(profile);
    const provider = resolveStorageProvider(profile.provider);
    const activeProviderId = resolveActiveProviderId(profile.provider);
    return provider.list(storageFolderForProvider(profile, activeProviderId));
  }

  private resolveImageKey(
    profile: StorageProfile,
    generatedKey: string,
    storageScope?: string | null,
  ): string {
    if (!profile.folderStrategy) return generatedKey;
    if (profile.folderStrategy === "main-category") {
      if (!storageScope || !/^[A-Za-z0-9-]+$/.test(storageScope)) {
        throw new Error("A valid main-category storage scope is required");
      }
      return `${storageScope}/${generatedKey}`;
    }
    throw new Error(
      `Unsupported storage folder strategy: ${profile.folderStrategy}`,
    );
  }
}

export const imageStorageOrchestrator = new ImageStorageOrchestrator();
