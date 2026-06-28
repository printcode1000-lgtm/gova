import 'server-only';

import {
  getStorageProfileById,
  toStorageProfileClientView,
} from '@/core/storage/profiles/storage-profile-loader.server';
import { imageStorageOrchestrator } from '@/core/storage/storage/image-storage-orchestrator.server';
import type { ImageUploadResult, StorageProfileClientView } from '@/core/storage/types/storage-profile.types';
import { traceServerLayer } from '@/core/monitor/trace-server-layer';

/** Server-side image storage service. */
export class ImageStorageService {
  getProfile(storageProfileId: string): StorageProfileClientView {
    return toStorageProfileClientView(getStorageProfileById(storageProfileId));
  }

  async uploadImage(
    storageProfileId: string,
    body: Buffer,
    contentType: string,
    replaceImageKey?: string | null
  ): Promise<ImageUploadResult> {
    return traceServerLayer('server-service', 'ImageStorageService.uploadImage', () =>
      imageStorageOrchestrator.upload({
        storageProfileId,
        body,
        contentType,
        replaceImageKey,
      })
    );
  }

  async deleteImage(storageProfileId: string, imageKey: string): Promise<void> {
    return traceServerLayer('server-service', 'ImageStorageService.deleteImage', () =>
      imageStorageOrchestrator.deleteByKey(storageProfileId, imageKey)
    );
  }
}

export const imageStorageService = new ImageStorageService();
