"use client";

import { useCallback, useRef, useState } from "react";
import type { StoredImage } from "@/core/storage/types/stored-image.types";
import type { StorageProfileId } from "@/core/storage/constants/storage-profiles";
import { imageStorageService } from "../services/image-storage-service";
import type { ImageUploadProgressStage } from "../services/image-storage-service.interface";
import { reportSystemIssue } from "@/features/system-logs/report-system-issue";
import {
  imageUploadQueue,
  isImageUploadCancelledError,
  type ImageUploadQueueHandle,
  type ImageUploadQueueStatus,
} from "../services/image-upload-queue";

interface UseStorageProfileUploadOptions {
  storageProfileId: StorageProfileId;
  storageScope?: string;
  queueOwnerId: string;
  value: StoredImage | null;
  onChange: (image: StoredImage | null) => void;
  onProgress?: (stage: ImageUploadProgressStage | "queued" | "deleting" | "idle") => void;
}

interface UseStorageProfileUploadResult {
  uploadFile: (file: File) => Promise<boolean>;
  removeImage: () => Promise<void>;
  isUploading: boolean;
  error: string | null;
  queueStatus: ImageUploadQueueStatus | null;
  queuePosition: number;
  cancelUpload: () => boolean;
}

/**
 * Hook for React state around ImageStorageService.
 * Pipeline: ImageStorageService → API (compress happens inside the service).
 */
export function useStorageProfileUpload({
  storageProfileId,
  storageScope,
  queueOwnerId,
  value,
  onChange,
  onProgress,
}: UseStorageProfileUploadOptions): UseStorageProfileUploadResult {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queueStatus, setQueueStatus] = useState<ImageUploadQueueStatus | null>(null);
  const [queuePosition, setQueuePosition] = useState(0);
  const uploadHandleRef = useRef<ImageUploadQueueHandle<unknown> | null>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      console.info(`[StorageImageManager:${storageProfileId}] pipeline-start`, {
        name: file.name,
        type: file.type,
        size: file.size,
        replacingImageKey: value?.imageKey ?? null,
      });
      setIsUploading(true);
      setError(null);
      onChange({ imageKey: "", url: value?.url ?? "", isUploading: true });

      try {
        console.info(
          `[StorageImageManager:${storageProfileId}] process-and-upload-start`,
        );
        const fingerprint = [
          queueOwnerId,
          storageProfileId,
          storageScope ?? "default",
          file.name,
          file.type,
          file.size,
          file.lastModified,
        ].join(":");
        const handle = imageUploadQueue.enqueue({
          deduplicationKey: fingerprint,
          onStateChange: (state) => {
            setQueueStatus(state.status);
            setQueuePosition(state.position);
            if (state.status === "queued") onProgress?.("queued");
          },
          run: (signal) =>
            imageStorageService.processAndUpload(
              storageProfileId,
              file,
              value?.imageKey ?? null,
              onProgress,
              storageScope,
              signal,
            ),
        });
        uploadHandleRef.current = handle;
        const result = await handle.promise;
        console.info(
          `[StorageImageManager:${storageProfileId}] storage-response-received`,
          {
            imageKey: result.imageKey,
            storageProfileId: result.storageProfileId,
            provider: result.provider,
            hasUrl: Boolean(result.url),
          },
        );
        onChange({ imageKey: result.imageKey, url: result.url });
        return true;
      } catch (err) {
        if (isImageUploadCancelledError(err)) {
          console.info(
            `[StorageImageManager:${storageProfileId}] queue-item-cancelled`,
          );
          setError(null);
          onChange(value ? { ...value, isUploading: false, error: undefined } : null);
          return false;
        }
        console.error(
          `[StorageImageManager:${storageProfileId}] pipeline-failed`,
          err,
        );
        reportSystemIssue({
          feature: "ProfileImageStorage",
          operation: `upload:${storageProfileId}`,
          error: err,
        });
        const message = err instanceof Error ? err.message : "Upload failed";
        setError(message);
        onChange(
          value ? { ...value, isUploading: false, error: message } : null,
        );
        return false;
      } finally {
        console.info(
          `[StorageImageManager:${storageProfileId}] pipeline-finished`,
        );
        setIsUploading(false);
        setQueueStatus(null);
        setQueuePosition(0);
        uploadHandleRef.current = null;
      }
    },
    [queueOwnerId, storageProfileId, storageScope, value, onChange, onProgress],
  );

  const cancelUpload = useCallback(
    () => uploadHandleRef.current?.cancel() ?? false,
    [],
  );

  const removeImage = useCallback(async () => {
    console.info(`[StorageImageManager:${storageProfileId}] delete-requested`, {
      imageKey: value?.imageKey ?? null,
    });
    if (!value?.imageKey) {
      onChange(null);
      onProgress?.("idle");
      return;
    }

    setIsUploading(true);
    setError(null);
    onProgress?.("deleting");
    try {
      await imageStorageService.deleteImage(storageProfileId, value.imageKey);
      console.info(
        `[StorageImageManager:${storageProfileId}] delete-completed`,
        {
          imageKey: value.imageKey,
        },
      );
      onChange(null);
    } catch (err) {
      console.error(
        `[StorageImageManager:${storageProfileId}] delete-failed`,
        err,
      );
      reportSystemIssue({
        feature: "ProfileImageStorage",
        operation: `delete:${storageProfileId}`,
        error: err,
      });
      const message = err instanceof Error ? err.message : "Delete failed";
      setError(message);
    } finally {
      setIsUploading(false);
      onProgress?.("idle");
    }
  }, [storageProfileId, value, onChange, onProgress]);

  return {
    uploadFile,
    removeImage,
    isUploading,
    error,
    queueStatus,
    queuePosition,
    cancelUpload,
  };
}
