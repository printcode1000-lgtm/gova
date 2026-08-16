"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StoredImage, StorageProfileId } from "@asol/storage-core";
import { imageStorageService } from "../services/image-storage-service";
import type { ImageUploadProgressStage } from "../services/image-storage-service.interface";
import { reportSystemIssue } from "@/features/system-logs/report-system-issue";
import {
  imageUploadQueue,
  isImageUploadCancelledError,
  type ImageUploadQueueHandle,
  type ImageUploadQueueStatus,
} from "../services/image-upload-queue";
import {
  deleteImageUploadDraft,
  updateImageUploadDraft,
} from "../services/image-upload-draft-service";

interface UseStorageProfileUploadOptions {
  storageProfileId: StorageProfileId;
  storageScope?: string;
  queueOwnerId: string;
  draftKey: string | null;
  value: StoredImage | null;
  onChange: (image: StoredImage | null) => void;
  onProgress?: (
    stage: ImageUploadProgressStage | "queued" | "deleting" | "idle",
  ) => void;
}

interface UseStorageProfileUploadResult {
  uploadFile: (file: File, draftId: string) => Promise<boolean>;
  removeImage: () => Promise<void>;
  isUploading: boolean;
  error: string | null;
  queueStatus: ImageUploadQueueStatus | null;
  queuePosition: number;
  cancelUpload: () => boolean;
}

async function runDraftOperation(
  operation: string,
  action: () => Promise<unknown>,
): Promise<void> {
  try {
    await action();
  } catch (error) {
    console.error(`[ImageUploadDrafts] ${operation} failed`, error);
    reportSystemIssue({
      feature: "ImageUploadDrafts",
      operation,
      error,
    });
  }
}

/**
 * Hook for React state around ImageStorageService.
 * Pipeline: ImageStorageService → API (compress happens inside the service).
 */
export function useStorageProfileUpload({
  storageProfileId,
  storageScope,
  queueOwnerId,
  draftKey,
  value,
  onChange,
  onProgress,
}: UseStorageProfileUploadOptions): UseStorageProfileUploadResult {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queueStatus, setQueueStatus] = useState<ImageUploadQueueStatus | null>(
    null,
  );
  const [queuePosition, setQueuePosition] = useState(0);
  const uploadHandleRef = useRef<ImageUploadQueueHandle<unknown> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const uploadFile = useCallback(
    async (file: File, draftId: string) => {
      if (mountedRef.current) {
        setIsUploading(true);
        setError(null);
      }
      onChange({ imageKey: "", url: value?.url ?? "", isUploading: true });

      try {
        const fingerprint = [
          queueOwnerId,
          storageProfileId,
          storageScope ?? "default",
          file.name,
          file.type,
          file.size,
          file.lastModified,
        ].join(":");
        const deduplicationKey = draftKey ?? fingerprint;
        if (draftKey) {
          const queuedDraft = await updateImageUploadDraft(draftKey, draftId, {
            status: "queued",
            queuePosition: Math.max(
              1,
              imageUploadQueue.getSnapshot().queued + 1,
            ),
            error: undefined,
          });
          if (!queuedDraft) throw new Error("Image upload draft is unavailable");
        }
        const handle = imageUploadQueue.enqueue({
          deduplicationKey,
          onStateChange: (state) => {
            if (mountedRef.current) {
              setQueueStatus(state.status);
              setQueuePosition(state.position);
              if (state.status === "queued") onProgress?.("queued");
            }
            if (draftKey) {
              void runDraftOperation("queue-state", () =>
                updateImageUploadDraft(draftKey, draftId, {
                  status:
                    state.status === "running" ? "uploading" : "queued",
                  queuePosition: state.position,
                  error: undefined,
                }),
              );
            }
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
        const uploadedImage = { imageKey: result.imageKey, url: result.url };
        let completionSaved = !draftKey;
        if (draftKey) {
          try {
            completionSaved = Boolean(
              await updateImageUploadDraft(draftKey, draftId, {
                status: "completed",
                queuePosition: 0,
                error: undefined,
                uploadedImage,
              }),
            );
          } catch (draftError) {
            console.error(
              "[ImageUploadDrafts] completion-state failed",
              draftError,
            );
            reportSystemIssue({
              feature: "ImageUploadDrafts",
              operation: "completion-state",
              error: draftError,
            });
          }
        }
        if (mountedRef.current) {
          onChange(uploadedImage);
          if (draftKey) {
            await runDraftOperation("delete-completed", () =>
              deleteImageUploadDraft(draftKey, draftId),
            );
          }
        } else if (!completionSaved) {
          await runDraftOperation("rollback-unrecoverable-upload", () =>
            imageStorageService.deleteImage(
              storageProfileId,
              uploadedImage.imageKey,
            ),
          );
        }
        return true;
      } catch (err) {
        if (isImageUploadCancelledError(err)) {
          if (draftKey) {
            await runDraftOperation("cancelled-state", () =>
              updateImageUploadDraft(draftKey, draftId, {
                status: "ready",
                queuePosition: 0,
                error: undefined,
              }),
            );
          }
          if (mountedRef.current) {
            setError(null);
            onChange(
              value ? { ...value, isUploading: false, error: undefined } : null,
            );
          }
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
        if (draftKey) {
          await runDraftOperation("failed-state", () =>
            updateImageUploadDraft(draftKey, draftId, {
              status: "failed",
              queuePosition: 0,
              error: message,
            }),
          );
        }
        if (mountedRef.current) {
          setError(message);
          onChange(
            value ? { ...value, isUploading: false, error: message } : null,
          );
        }
        return false;
      } finally {
        if (mountedRef.current) {
          setIsUploading(false);
          setQueueStatus(null);
          setQueuePosition(0);
        }
        uploadHandleRef.current = null;
      }
    },
    [
      draftKey,
      queueOwnerId,
      storageProfileId,
      storageScope,
      value,
      onChange,
      onProgress,
    ],
  );

  const cancelUpload = useCallback(
    () => uploadHandleRef.current?.cancel() ?? false,
    [],
  );

  const removeImage = useCallback(async () => {
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
