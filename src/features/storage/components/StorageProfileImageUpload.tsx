'use client';

import * as React from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/lib/i18n';
import type { StoredImage } from '@/core/storage/types/stored-image.types';
import { useStorageProfileUpload } from '@/features/storage/hooks/use-storage-profile-upload';

import type { StorageProfileId } from '@/core/storage/constants/storage-profiles';

export interface StorageProfileImageUploadProps {
  storageProfileId: StorageProfileId;
  value?: StoredImage | null;
  onChange: (image: StoredImage | null) => void;
  aspectRatio?: 'square' | 'landscape' | 'portrait' | 'wide';
  label?: string;
  hint?: string;
  error?: string;
}

/**
 * Image upload component driven solely by storageProfileId.
 * All limits, compression, and provider resolution happen outside the UI.
 */
export function StorageProfileImageUpload({
  storageProfileId,
  value,
  onChange,
  aspectRatio = 'landscape',
  label,
  hint,
  error,
}: StorageProfileImageUploadProps) {
  const { t } = useTranslation();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const { uploadFile, removeImage, isUploading, error: uploadError } = useStorageProfileUpload({
    storageProfileId,
    value: value ?? null,
    onChange,
  });

  const aspectClasses = {
    square: 'aspect-square',
    landscape: 'aspect-video',
    portrait: 'aspect-[3/4]',
    wide: 'aspect-[21/9]',
  };

  const displayError = error || uploadError;

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    void uploadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const busy = isUploading || value?.isUploading;

  return (
    <div className="space-y-2">
      {label && (
        <Label className="text-sm font-medium">
          {label}
          {hint && <span className="text-xs text-muted-foreground ml-2">{hint}</span>}
        </Label>
      )}

      <div
        className={cn(
          'relative rounded-lg border-2 border-dashed transition-all duration-200',
          aspectClasses[aspectRatio],
          isDragging && 'border-primary bg-primary/5',
          displayError ? 'border-destructive' : 'border-border',
          value?.url && 'border-solid'
        )}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
      >
        {value?.url ? (
          <>
            <img
              src={value.url}
              alt={t('onboarding.form.uploadedAlt')}
              className="absolute inset-0 h-full w-full rounded-lg object-cover"
            />
            {busy && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-lg">
                <span className="text-sm text-muted-foreground">{t('onboarding.common.uploading')}</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => void removeImage()}
              disabled={busy}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-background shadow-md hover:bg-destructive hover:text-destructive-foreground transition-colors disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 cursor-pointer"
            onClick={() => inputRef.current?.click()}
          >
            <div className="p-3 rounded-full bg-muted">
              {busy ? (
                <Upload className="h-6 w-6 text-muted-foreground animate-pulse" />
              ) : (
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <p className="text-sm text-muted-foreground text-center px-4">
              {t('onboarding.form.dropImage')}
            </p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleInputChange}
          disabled={busy}
        />
      </div>

      {displayError && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {displayError}
        </p>
      )}
    </div>
  );
}
