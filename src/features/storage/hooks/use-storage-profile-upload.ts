'use client';

import { useCallback, useState } from 'react';
import { compressImageToWebP } from '../processing/image-processor.client';
import type { StoredImage } from '@/core/storage/types/stored-image.types';
import { imageStorageApiService } from '../services/image-storage-api-service';

interface UseStorageProfileUploadOptions {
  storageProfileId: string;
  value: StoredImage | null;
  onChange: (image: StoredImage | null) => void;
}

interface UseStorageProfileUploadResult {
  uploadFile: (file: File) => Promise<void>;
  removeImage: () => Promise<void>;
  isUploading: boolean;
  error: string | null;
}

/**
 * Hook coordinating the client-side image pipeline:
 * load profile limits → validate → compress → upload via API.
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
        const profile = await imageStorageApiService.getProfileLimits(storageProfileId);
        const compressed = await compressImageToWebP(file, profile);
        const result = await imageStorageApiService.uploadImage(
          storageProfileId,
          compressed,
          value?.imageKey ?? null
        );
        onChange({ imageKey: result.imageKey, url: result.url });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setError(message);
        onChange(value ? { ...value, isUploading: false, error: message } : null);
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
      await imageStorageApiService.deleteImage(storageProfileId, value.imageKey);
      onChange(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      setError(message);
    } finally {
      setIsUploading(false);
    }
  }, [storageProfileId, value, onChange]);

  return { uploadFile, removeImage, isUploading, error };
}
