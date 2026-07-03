"use client";

import { useCallback, useState } from "react";
import type { StoredImage } from "@/core/storage/types/stored-image.types";
import type { StorageProfileId } from "@/core/storage/constants/storage-profiles";
import { imageStorageService } from "../services/image-storage-service";
import type { ImageUploadProgressStage } from "../services/image-storage-service.interface";
import { reportSystemIssue } from "@/features/system-logs/report-system-issue";

interface UseStorageProfileUploadOptions {
  storageProfileId: StorageProfileId;
  storageScope?: string;
  value: StoredImage | null;
  onChange: (image: StoredImage | null) => void;
  onProgress?: (stage: ImageUploadProgressStage | "deleting" | "idle") => void;
}

interface UseStorageProfileUploadResult {
  uploadFile: (file: File) => Promise<boolean>;
  removeImage: () => Promise<void>;
  isUploading: boolean;
  error: string | null;
}

/**
 * Hook for React state around ImageStorageService.
 * Pipeline: ImageStorageService → API (compress happens inside the service).
 */
export function useStorageProfileUpload({
  storageProfileId,
  storageScope,
  value,
  onChange,
  onProgress,
}: UseStorageProfileUploadOptions): UseStorageProfileUploadResult {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        const result = await imageStorageService.processAndUpload(
          storageProfileId,
          file,
          value?.imageKey ?? null,
          onProgress,
          storageScope,
        );
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
      }
    },
    [storageProfileId, storageScope, value, onChange, onProgress],
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

  return { uploadFile, removeImage, isUploading, error };
}
