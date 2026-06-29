'use client';

import * as React from 'react';
import { AlertCircle, Camera, Image as ImageIcon, Images, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { StorageProfiles, type StorageProfileId } from '@/core/storage/constants/storage-profiles';
import type { StoredImage } from '@/core/storage/types/stored-image.types';
import { useStorageProfileUpload } from '@/features/storage/hooks/use-storage-profile-upload';
import {
  canUseNativeImageSource,
  captureSingleImage,
  chooseSingleImage,
} from '@/platform/media/capacitor-image-source-adapter';

type StorageImageAspectRatio = 'square' | 'landscape' | 'portrait' | 'wide';

export interface StorageImageManagerConfig {
  id: string;
  storageProfileId: StorageProfileId;
  maxItems: number;
  aspectRatio: StorageImageAspectRatio;
  allowReplace: boolean;
  confirmUpload: boolean;
  confirmRemove: boolean;
}

interface StorageImageManagerProps {
  config: StorageImageManagerConfig;
  value: StoredImage[];
  onChange: (images: StoredImage[]) => void;
  className?: string;
}

const storageProfileIds = new Set<string>(Object.values(StorageProfiles));
const aspectRatioIds = new Set<string>(['square', 'landscape', 'portrait', 'wide']);

const aspectClasses: Record<StorageImageAspectRatio, string> = {
  square: 'aspect-square',
  landscape: 'aspect-video',
  portrait: 'aspect-[3/4]',
  wide: 'aspect-[21/9]',
};

const CONFIRM_UPLOAD_MESSAGE = 'Upload this image and save its key?';
const CONFIRM_REMOVE_MESSAGE = 'Remove this image?';
const CONFIRM_CLEAR_SELECTED_MESSAGE = 'Clear the selected image?';

export function parseStorageImageManagerConfig(raw: unknown): StorageImageManagerConfig {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid storage image manager config');
  }

  const config = raw as Record<string, unknown>;
  if (typeof config.id !== 'string' || !config.id) {
    throw new Error('Storage image manager config requires id');
  }
  if (typeof config.storageProfileId !== 'string' || !storageProfileIds.has(config.storageProfileId)) {
    throw new Error(`Invalid storageProfileId for ${config.id}`);
  }
  if (typeof config.aspectRatio !== 'string' || !aspectRatioIds.has(config.aspectRatio)) {
    throw new Error(`Invalid aspectRatio for ${config.id}`);
  }
  if (typeof config.maxItems !== 'number' || !Number.isInteger(config.maxItems) || config.maxItems < 1) {
    throw new Error(`Invalid maxItems for ${config.id}`);
  }
  if (typeof config.allowReplace !== 'boolean') {
    throw new Error(`Invalid allowReplace for ${config.id}`);
  }
  if (typeof config.confirmUpload !== 'boolean') {
    throw new Error(`Invalid confirmUpload for ${config.id}`);
  }
  if (typeof config.confirmRemove !== 'boolean') {
    throw new Error(`Invalid confirmRemove for ${config.id}`);
  }

  return {
    id: config.id,
    storageProfileId: config.storageProfileId as StorageProfileId,
    maxItems: config.maxItems,
    aspectRatio: config.aspectRatio as StorageImageAspectRatio,
    allowReplace: config.allowReplace,
    confirmUpload: config.confirmUpload,
    confirmRemove: config.confirmRemove,
  };
}

function normalizeImages(images: StoredImage[], maxItems: number): StoredImage[] {
  return images.filter((image) => image.imageKey && image.url).slice(0, maxItems);
}

function removeAt(images: StoredImage[], index: number): StoredImage[] {
  return images.filter((_, itemIndex) => itemIndex !== index);
}

function replaceAt(images: StoredImage[], index: number, image: StoredImage | null): StoredImage[] {
  const next = [...images];
  if (image) {
    next[index] = image;
  } else {
    next.splice(index, 1);
  }
  return next.filter(Boolean);
}

function StorageImageSlot({
  config,
  image,
  index,
  onUploaded,
  onRemoved,
}: {
  config: StorageImageManagerConfig;
  image: StoredImage | null;
  index: number;
  onUploaded: (index: number, image: StoredImage) => void;
  onRemoved: (index: number) => void;
}) {
  const { t } = useTranslation();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isChoosingSource, setIsChoosingSource] = React.useState(false);
  const [sourceError, setSourceError] = React.useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = React.useState<StoredImage | null>(null);

  React.useEffect(() => {
    setUploadedImage(image);
  }, [image]);

  React.useEffect(() => {
    return () => {
      if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
    };
  }, [selectedPreviewUrl]);

  const { uploadFile, removeImage, isUploading, error } = useStorageProfileUpload({
    storageProfileId: config.storageProfileId,
    value: selectedFile ? uploadedImage : image,
    onChange: (nextImage) => {
      if (nextImage?.isUploading) return;
      if (nextImage) {
        setUploadedImage(nextImage);
        onUploaded(index, nextImage);
        return;
      }
      setUploadedImage(null);
      onRemoved(index);
    },
  });

  const previewUrl = selectedPreviewUrl ?? image?.url ?? null;
  const displayError = sourceError ?? error;
  const busy = isUploading || image?.isUploading || isChoosingSource;
  const canChoose = !previewUrl || (config.allowReplace && !image?.imageKey && !selectedFile);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setSourceError(null);
    if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
    setSelectedFile(file);
    setSelectedPreviewUrl(URL.createObjectURL(file));
  };

  const chooseFromDevice = async () => {
    if (busy || !canChoose) return;
    setSourceError(null);

    if (!canUseNativeImageSource()) {
      inputRef.current?.click();
      return;
    }

    setIsChoosingSource(true);
    try {
      const file = await chooseSingleImage();
      if (file) processFile(file);
    } catch (sourceSelectionError) {
      console.error('[StorageImageManager] Unable to choose an image.', sourceSelectionError);
      setSourceError(t('storage.imageSource.error'));
    } finally {
      setIsChoosingSource(false);
    }
  };

  const captureFromCamera = async () => {
    if (busy || !canChoose) return;
    setSourceError(null);

    if (!canUseNativeImageSource()) {
      cameraInputRef.current?.click();
      return;
    }

    setIsChoosingSource(true);
    try {
      const file = await captureSingleImage();
      if (file) processFile(file);
    } catch (cameraError) {
      console.error('[StorageImageManager] Unable to capture an image.', cameraError);
      setSourceError(t('storage.imageSource.cameraError'));
    } finally {
      setIsChoosingSource(false);
    }
  };

  const uploadSelected = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!selectedFile) return;
    if (config.confirmUpload && !window.confirm(CONFIRM_UPLOAD_MESSAGE)) return;

    void uploadFile(selectedFile).then((uploaded) => {
      if (!uploaded) return;
      if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
      setSelectedFile(null);
      setSelectedPreviewUrl(null);
    });
  };

  const removeCurrent = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (selectedFile) {
      if (config.confirmRemove && !window.confirm(CONFIRM_CLEAR_SELECTED_MESSAGE)) return;
      if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
      setSelectedFile(null);
      setSelectedPreviewUrl(null);
      return;
    }

    if (config.confirmRemove && !window.confirm(CONFIRM_REMOVE_MESSAGE)) return;
    void removeImage();
  };

  return (
    <div
      className={cn(
        'relative rounded-lg border-2 border-dashed transition-all duration-200',
        aspectClasses[config.aspectRatio],
        isDragging && 'border-primary bg-primary/5',
        displayError ? 'border-destructive' : 'border-border',
        previewUrl && 'border-solid'
      )}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        const file = event.dataTransfer.files[0];
        if (file && canChoose) processFile(file);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
    >
      {previewUrl ? (
        <>
          <img src={previewUrl} alt="" className="absolute inset-0 h-full w-full rounded-lg object-cover" />
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/60">
              <Upload className="h-6 w-6 animate-pulse text-muted-foreground" />
            </div>
          )}
          <button
            type="button"
            onClick={removeCurrent}
            disabled={busy}
            aria-label="Remove image"
            title="Remove image"
            className="absolute right-2 top-2 rounded-full bg-background p-1.5 shadow-md transition-colors hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
          {selectedFile && (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              onClick={uploadSelected}
              disabled={busy}
              aria-label="Upload image"
              title="Upload image"
              className="absolute bottom-2 left-2 h-9 w-9 bg-background/90 shadow-md"
            >
              <Upload className="h-4 w-4" />
            </Button>
          )}
        </>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={busy}
              aria-label={t('storage.imageSource.open')}
              title={t('storage.imageSource.open')}
              className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg px-4 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="rounded-full bg-muted p-3">
                {busy ? (
                  <Upload className="h-6 w-6 animate-pulse text-muted-foreground" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                )}
              </span>
              <span className="text-sm font-medium text-primary">
                {t('storage.imageSource.open')}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="min-w-56">
            <DropdownMenuLabel>{t('storage.imageSource.title')}</DropdownMenuLabel>
            <DropdownMenuItem className="gap-3 py-3" onSelect={() => void chooseFromDevice()}>
              <Images className="h-5 w-5 text-primary" aria-hidden="true" />
              {t('storage.imageSource.device')}
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-3 py-3" onSelect={() => void captureFromCamera()}>
              <Camera className="h-5 w-5 text-primary" aria-hidden="true" />
              {t('storage.imageSource.camera')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file && canChoose) processFile(file);
          event.target.value = '';
        }}
        disabled={busy}
      />

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file && canChoose) processFile(file);
          event.target.value = '';
        }}
        disabled={busy}
      />

      {displayError && (
        <p className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-background/90 px-2 py-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          {displayError}
        </p>
      )}
    </div>
  );
}

export function StorageImageManager({ config, value, onChange, className }: StorageImageManagerProps) {
  const parsedConfig = parseStorageImageManagerConfig(config);
  const maxItems = Math.max(1, parsedConfig.maxItems);
  const images = normalizeImages(value, maxItems);
  const slots = Array.from({ length: maxItems }, (_, index) => images[index] ?? null);

  return (
    <div className={cn(maxItems > 1 ? 'grid gap-3 sm:grid-cols-3 lg:grid-cols-1' : 'space-y-3', className)}>
      {slots.map((image, index) => (
        <StorageImageSlot
          key={`${parsedConfig.id}-${index}`}
          config={parsedConfig}
          image={image}
          index={index}
          onUploaded={(itemIndex, uploadedImage) => {
            onChange(normalizeImages(replaceAt(images, itemIndex, uploadedImage), maxItems));
          }}
          onRemoved={(itemIndex) => {
            onChange(normalizeImages(removeAt(images, itemIndex), maxItems));
          }}
        />
      ))}
    </div>
  );
}
