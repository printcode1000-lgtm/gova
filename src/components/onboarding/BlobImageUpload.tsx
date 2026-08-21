"use client";

import * as React from 'react';
import { AlertCircle, Image as ImageIcon, X } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { NativeCore, isCancelledError } from '@asol/native-core';

interface BlobImageUploadProps {
  value?: { url: string; preview?: string } | null;
  onChange: (file: File | null, preview: string | null) => void;
  onRemove: () => void;
  accept?: string;
  maxSize?: number;
  aspectRatio?: 'square' | 'landscape' | 'portrait' | 'wide';
  label?: string;
  hint?: string;
  error?: string;
}

/** Legacy local-preview upload for out-of-scope flows (e.g. collections). */
export function BlobImageUpload({
  value,
  onChange,
  onRemove,
  accept = 'image/*',
  maxSize = 5 * 1024 * 1024,
  aspectRatio = 'landscape',
  label,
  hint,
  error,
}: BlobImageUploadProps) {
  const { t, formatApiError } = useTranslation();
  const [isDragging, setIsDragging] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);

  const aspectClasses = {
    square: 'aspect-square',
    landscape: 'aspect-video',
    portrait: 'aspect-[3/4]',
    wide: 'aspect-[21/9]',
  };

  const processFile = (file: File) => {
    setLocalError(null);
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLocalError(t('onboarding.form.invalidImageType'));
      return;
    }

    if (file.size > maxSize) {
      setLocalError(
        t('onboarding.form.fileTooLarge', { maxSize: Math.round(maxSize / 1024 / 1024) }),
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      onChange(file, e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  };

  const openPicker = async () => {
    try {
      const res = await NativeCore.pickFiles({
        types: accept.split(",").map((entry) => entry.trim()).filter(Boolean),
        multiple: false,
      });
      if (!res.ok) {
        if (isCancelledError(res.error)) return;
        setLocalError(formatApiError(res.error));
        return;
      }
      const first = res.value[0];
      if (first?.blob) {
        const file = new File([first.blob], first.name, { type: first.mimeType });
        processFile(file);
      }
    } catch (error) {
      if (isCancelledError(error)) return;
      setLocalError(formatApiError(error));
    }
  };

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
          error || localError ? 'border-destructive' : 'border-border',
          value && 'border-solid',
        )}
        onDrop={handleDrop}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
      >
        {value ? (
          <>
            <img
              src={value.preview || value.url}
              alt={t('onboarding.form.uploadedAlt')}
              className="absolute inset-0 h-full w-full rounded-lg object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 transition-opacity rounded-lg" />
            <button
              type="button"
              onClick={onRemove}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-background shadow-md transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2"
            onClick={() => void openPicker()}
          >
            <div className="rounded-full bg-muted p-3">
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">{t('onboarding.form.dropImage')}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('onboarding.form.imageFormats', {
                  maxSize: Math.round(maxSize / 1024 / 1024),
                })}
              </p>
            </div>
          </div>
        )}
      </div>

      {(error || localError) && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error || localError}
        </p>
      )}
    </div>
  );
}
