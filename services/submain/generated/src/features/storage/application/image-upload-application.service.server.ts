import "server-only";

import type {
  ImageUploadResult,
  StorageProfileClientView,
} from "@asol/storage-core";
import {
  imageStorageOrchestrator,
  toStorageProfileClientView,
  getStorageProfileById,
} from "@asol/storage-core/server";
import { traceServerLayer } from '@asol/observability-core/server';

export interface UploadImageCommand {
  storageProfileId: string;
  body: Buffer;
  contentType: string;
  storageScope?: string | null;
  replaceImageKey?: string | null;
}

/**
 * Application Layer — coordinates Storage Profile → Rules → Processing → Storage → Provider.
 * The only server entry point for upload/delete below Business API.
 */
export class ImageUploadApplicationService {
  getProfile(storageProfileId: string): StorageProfileClientView {
    return toStorageProfileClientView(getStorageProfileById(storageProfileId));
  }

  upload(command: UploadImageCommand): Promise<ImageUploadResult> {
    return traceServerLayer(
      "server-service",
      "ImageUploadApplicationService.upload",
      () => imageStorageOrchestrator.upload(command),
    );
  }

  deleteImage(storageProfileId: string, imageKey: string): Promise<void> {
    return traceServerLayer(
      "server-service",
      "ImageUploadApplicationService.deleteImage",
      () => imageStorageOrchestrator.deleteByKey(storageProfileId, imageKey),
    );
  }

  /**
   * The public URL of a stored key.
   *
   * Callers persist keys and ask for the URL when they need one, so the bucket
   * a profile points at can change without touching a single stored row.
   */
  resolveImageUrl(storageProfileId: string, imageKey: string): string {
    return imageStorageOrchestrator.resolveUrl(storageProfileId, imageKey);
  }
}

export const imageUploadApplicationService =
  new ImageUploadApplicationService();
