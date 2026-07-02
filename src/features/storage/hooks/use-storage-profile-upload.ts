'use client';

import { useCallback, useState } from 'react';
import type { StoredImage } from '@/core/storage/types/stored-image.types';
import type { StorageProfileId } from '@/core/storage/constants/storage-profiles';
import { imageStorageService } from '../services/image-storage-service';
import { reportSystemIssue } from '@/features/system-logs/report-system-issue';

interface UseStorageProfileUploadOptions {
  storageProfileId: StorageProfileId;
  value: StoredImage | null;
  onChange: (image: StoredImage | null) => void;
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
  value,
  onChange,
}: UseStorageProfileUploadOptions): UseStorageProfileUploadResult {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setError(null);
      onChange({ imageKey: '', url: value?.url ?? '', isUploading: true });

      try {
        const result = await imageStorageService.processAndUpload(
          storageProfileId,
          file,
          value?.imageKey ?? null
        );
        onChange({ imageKey: result.imageKey, url: result.url });
        return true;
      } catch (err) {
        reportSystemIssue({
          feature: 'ProfileImageStorage',
          operation: `upload:${storageProfileId}`,
          error: err,
        });
        const message = err instanceof Error ? err.message : 'Upload failed';
        setError(message);
        onChange(value ? { ...value, isUploading: false, error: message } : null);
        return false;
      } finally {
        setIsUploading(false);
      }
    },
    [storageProfileId, value, onChange]
  );

  const removeImage = useCallback(async () => {
    if (!value?.imageKey) {
      onChange(null);
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      await imageStorageService.deleteImage(storageProfileId, value.imageKey);
      onChange(null);
    } catch (err) {
      reportSystemIssue({
        feature: 'ProfileImageStorage',
        operation: `delete:${storageProfileId}`,
        error: err,
      });
      const message = err instanceof Error ? err.message : 'Delete failed';
      setError(message);
    } finally {
      setIsUploading(false);
    }
  }, [storageProfileId, value, onChange]);

  return { uploadFile, removeImage, isUploading, error };
}
