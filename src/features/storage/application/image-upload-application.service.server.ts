import "server-only";

import { imageStorageOrchestrator } from "@/core/storage/storage/image-storage-orchestrator.server";
import {
  toStorageProfileClientView,
  getStorageProfileById,
} from "@/core/storage/profiles/storage-profile-loader.server";
import type {
  ImageUploadResult,
  StorageProfileClientView,
} from "@/core/storage/types/storage-profile.types";
import { traceServerLayer } from "@/core/monitor/trace-server-layer";

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
}

export const imageUploadApplicationService =
  new ImageUploadApplicationService();
