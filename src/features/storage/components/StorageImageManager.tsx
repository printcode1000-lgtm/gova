"use client";

import * as React from "react";
import {
  AlertCircle,
  Camera,
  Image as ImageIcon,
  Images,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import {
  StorageProfiles,
  type StorageProfileId,
} from "@/core/storage/constants/storage-profiles";
import type { StoredImage } from "@/core/storage/types/stored-image.types";
import { useStorageProfileUpload } from "@/features/storage/hooks/use-storage-profile-upload";
import {
  canUseNativeImageSource,
  captureSingleImage,
  chooseSingleImage,
} from "@/platform/media/capacitor-image-source-adapter";

type StorageImageAspectRatio = "square" | "landscape" | "portrait" | "wide";

export interface StorageImageManagerConfig {
  id: string;
  storageProfileId: StorageProfileId;
  maxItems: number;
  aspectRatio: StorageImageAspectRatio;
  allowReplace: boolean;
  confirmUpload: boolean;
  confirmRemove: boolean;
  deleteFromStorageOnRemove?: boolean;
}

interface StorageImageManagerProps {
  config: StorageImageManagerConfig;
  value: StoredImage[];
  onChange: (images: StoredImage[]) => void;
  className?: string;
}

const storageProfileIds = new Set<string>(Object.values(StorageProfiles));
const aspectRatioIds = new Set<string>([
  "square",
  "landscape",
  "portrait",
  "wide",
]);

const aspectClasses: Record<StorageImageAspectRatio, string> = {
  square: "aspect-square",
  landscape: "aspect-video",
  portrait: "aspect-[3/4]",
  wide: "aspect-[21/9]",
};

const CONFIRM_UPLOAD_MESSAGE = "Upload this image and save its key?";
const CONFIRM_REMOVE_MESSAGE = "Remove this image?";
const CONFIRM_CLEAR_SELECTED_MESSAGE = "Clear the selected image?";

function traceStorageImageManager(
  configId: string,
  step: string,
  details: Record<string, unknown> = {},
) {
  console.info(`[StorageImageManager:${configId}] ${step}`, details);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(reader.error ?? new Error("Unable to read image preview"));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

export function parseStorageImageManagerConfig(
  raw: unknown,
): StorageImageManagerConfig {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid storage image manager config");
  }

  const config = raw as Record<string, unknown>;
  if (typeof config.id !== "string" || !config.id) {
    throw new Error("Storage image manager config requires id");
  }
  if (
    typeof config.storageProfileId !== "string" ||
    !storageProfileIds.has(config.storageProfileId)
  ) {
    throw new Error(`Invalid storageProfileId for ${config.id}`);
  }
  if (
    typeof config.aspectRatio !== "string" ||
    !aspectRatioIds.has(config.aspectRatio)
  ) {
    throw new Error(`Invalid aspectRatio for ${config.id}`);
  }
  if (
    typeof config.maxItems !== "number" ||
    !Number.isInteger(config.maxItems) ||
    config.maxItems < 1
  ) {
    throw new Error(`Invalid maxItems for ${config.id}`);
  }
  if (typeof config.allowReplace !== "boolean") {
    throw new Error(`Invalid allowReplace for ${config.id}`);
  }
  if (typeof config.confirmUpload !== "boolean") {
    throw new Error(`Invalid confirmUpload for ${config.id}`);
  }
  if (typeof config.confirmRemove !== "boolean") {
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
    deleteFromStorageOnRemove: config.deleteFromStorageOnRemove !== false,
  };
}

function normalizeImages(
  images: StoredImage[],
  maxItems: number,
): StoredImage[] {
  return images
    .filter((image) => image.imageKey && image.url)
    .slice(0, maxItems);
}

function removeAt(images: StoredImage[], index: number): StoredImage[] {
  return images.filter((_, itemIndex) => itemIndex !== index);
}

function replaceAt(
  images: StoredImage[],
  index: number,
  image: StoredImage | null,
): StoredImage[] {
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
  const [selectedPreviewUrl, setSelectedPreviewUrl] = React.useState<
    string | null
  >(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isChoosingSource, setIsChoosingSource] = React.useState(false);
  const [sourceError, setSourceError] = React.useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = React.useState<StoredImage | null>(
    null,
  );

  React.useEffect(() => {
    traceStorageImageManager(config.id, "slot-mounted", {
      index,
      storageProfileId: config.storageProfileId,
      hasStoredImage: Boolean(image?.imageKey),
    });
    return () =>
      traceStorageImageManager(config.id, "slot-unmounted", { index });
  }, [config.id, config.storageProfileId, index]);

  React.useEffect(() => {
    traceStorageImageManager(config.id, "value-synchronized", {
      index,
      imageKey: image?.imageKey ?? null,
      hasUrl: Boolean(image?.url),
    });
    setUploadedImage(image);
  }, [config.id, image, index]);

  const { uploadFile, removeImage, isUploading, error } =
    useStorageProfileUpload({
      storageProfileId: config.storageProfileId,
      value: selectedFile ? uploadedImage : image,
      onChange: (nextImage) => {
        traceStorageImageManager(config.id, "upload-state-change", {
          index,
          isUploading: Boolean(nextImage?.isUploading),
          imageKey: nextImage?.imageKey ?? null,
          hasUrl: Boolean(nextImage?.url),
          error: nextImage?.error ?? null,
        });
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
  const canChoose =
    !previewUrl || (config.allowReplace && !image?.imageKey && !selectedFile);

  const uploadCandidate = async (file: File) => {
    traceStorageImageManager(config.id, "upload-started", {
      index,
      name: file.name,
      type: file.type,
      size: file.size,
    });
    const uploaded = await uploadFile(file);
    if (!uploaded) {
      traceStorageImageManager(config.id, "upload-failed", { index });
      return false;
    }
    traceStorageImageManager(config.id, "upload-completed", { index });
    setSelectedFile(null);
    setSelectedPreviewUrl(null);
    return true;
  };

  const processFile = async (file: File) => {
    traceStorageImageManager(config.id, "file-received", {
      index,
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified,
    });
    if (!file.type.startsWith("image/")) {
      const invalidTypeError = new Error(
        `Unsupported selected file type: ${file.type || "unknown"}`,
      );
      console.error(
        `[StorageImageManager:${config.id}] file-rejected`,
        invalidTypeError,
      );
      setSourceError(invalidTypeError.message);
      return;
    }
    setSourceError(null);
    setSelectedFile(file);
    try {
      traceStorageImageManager(config.id, "preview-read-started", { index });
      const preview = await fileToDataUrl(file);
      setSelectedPreviewUrl(preview);
      traceStorageImageManager(config.id, "preview-ready", {
        index,
        previewScheme: "data:",
        previewLength: preview.length,
      });
    } catch (previewError) {
      console.error(
        `[StorageImageManager:${config.id}] preview-failed`,
        previewError,
      );
      setSourceError(
        previewError instanceof Error
          ? previewError.message
          : "Unable to preview selected image",
      );
      setSelectedFile(null);
      return;
    }

    const confirmed =
      !config.confirmUpload || window.confirm(CONFIRM_UPLOAD_MESSAGE);
    traceStorageImageManager(config.id, "automatic-upload-confirmation", {
      index,
      confirmed,
    });
    if (confirmed) await uploadCandidate(file);
  };

  const chooseFromDevice = async () => {
    traceStorageImageManager(config.id, "device-source-requested", {
      index,
      busy,
      canChoose,
      native: canUseNativeImageSource(),
    });
    if (busy || !canChoose) {
      traceStorageImageManager(config.id, "device-source-blocked", {
        index,
        busy,
        canChoose,
      });
      return;
    }
    setSourceError(null);

    if (!canUseNativeImageSource()) {
      inputRef.current?.click();
      traceStorageImageManager(config.id, "web-file-picker-opened", { index });
      return;
    }

    setIsChoosingSource(true);
    try {
      const file = await chooseSingleImage();
      traceStorageImageManager(config.id, "native-file-picker-returned", {
        index,
        selected: Boolean(file),
      });
      if (file) await processFile(file);
    } catch (sourceSelectionError) {
      console.error(
        "[StorageImageManager] Unable to choose an image.",
        sourceSelectionError,
      );
      setSourceError(t("storage.imageSource.error"));
    } finally {
      setIsChoosingSource(false);
    }
  };

  const captureFromCamera = async () => {
    traceStorageImageManager(config.id, "camera-source-requested", {
      index,
      busy,
      canChoose,
      native: canUseNativeImageSource(),
    });
    if (busy || !canChoose) {
      traceStorageImageManager(config.id, "camera-source-blocked", {
        index,
        busy,
        canChoose,
      });
      return;
    }
    setSourceError(null);

    if (!canUseNativeImageSource()) {
      cameraInputRef.current?.click();
      traceStorageImageManager(config.id, "web-camera-picker-opened", {
        index,
      });
      return;
    }

    setIsChoosingSource(true);
    try {
      const file = await captureSingleImage();
      traceStorageImageManager(config.id, "native-camera-returned", {
        index,
        selected: Boolean(file),
      });
      if (file) await processFile(file);
    } catch (cameraError) {
      console.error(
        "[StorageImageManager] Unable to capture an image.",
        cameraError,
      );
      setSourceError(t("storage.imageSource.cameraError"));
    } finally {
      setIsChoosingSource(false);
    }
  };

  const uploadSelected = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!selectedFile) return;
    const confirmed =
      !config.confirmUpload || window.confirm(CONFIRM_UPLOAD_MESSAGE);
    traceStorageImageManager(config.id, "manual-upload-confirmation", {
      index,
      confirmed,
    });
    if (confirmed) void uploadCandidate(selectedFile);
  };

  const removeCurrent = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (selectedFile) {
      if (
        config.confirmRemove &&
        !window.confirm(CONFIRM_CLEAR_SELECTED_MESSAGE)
      )
        return;
      traceStorageImageManager(config.id, "selected-file-cleared", { index });
      setSelectedFile(null);
      setSelectedPreviewUrl(null);
      return;
    }

    if (config.confirmRemove && !window.confirm(CONFIRM_REMOVE_MESSAGE)) return;
    traceStorageImageManager(config.id, "stored-image-removal-confirmed", {
      index,
      imageKey: image?.imageKey ?? null,
      deleteFromStorage: config.deleteFromStorageOnRemove !== false,
    });
    if (config.deleteFromStorageOnRemove === false) {
      onRemoved(index);
      return;
    }
    void removeImage();
  };

  return (
    <div
      className={cn(
        "relative rounded-lg border-2 border-dashed transition-all duration-200",
        aspectClasses[config.aspectRatio],
        isDragging && "border-primary bg-primary/5",
        displayError ? "border-destructive" : "border-border",
        previewUrl && "border-solid",
      )}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        const file = event.dataTransfer.files[0];
        if (file && canChoose) void processFile(file);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
    >
      {previewUrl ? (
        <>
          <img
            src={previewUrl}
            alt=""
            className="absolute inset-0 h-full w-full rounded-lg object-cover"
            onLoad={() =>
              traceStorageImageManager(config.id, "preview-rendered", {
                index,
                source: selectedPreviewUrl ? "selected-file" : "stored-image",
              })
            }
            onError={() => {
              const previewError = new Error(
                selectedPreviewUrl
                  ? "Selected image preview failed to render"
                  : "Stored image failed to render",
              );
              console.error(
                `[StorageImageManager:${config.id}] preview-render-failed`,
                previewError,
              );
              setSourceError(previewError.message);
            }}
          />
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
              aria-label={t("storage.imageSource.open")}
              title={t("storage.imageSource.open")}
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
                {t("storage.imageSource.open")}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="min-w-56">
            <DropdownMenuLabel>
              {t("storage.imageSource.title")}
            </DropdownMenuLabel>
            <DropdownMenuItem
              className="gap-3 py-3"
              onSelect={() => void chooseFromDevice()}
            >
              <Images className="h-5 w-5 text-primary" aria-hidden="true" />
              {t("storage.imageSource.device")}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-3 py-3"
              onSelect={() => void captureFromCamera()}
            >
              <Camera className="h-5 w-5 text-primary" aria-hidden="true" />
              {t("storage.imageSource.camera")}
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
          traceStorageImageManager(config.id, "web-file-input-changed", {
            index,
            selected: Boolean(file),
          });
          if (file && canChoose) void processFile(file);
          event.target.value = "";
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
          traceStorageImageManager(config.id, "web-camera-input-changed", {
            index,
            selected: Boolean(file),
          });
          if (file && canChoose) void processFile(file);
          event.target.value = "";
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

export function StorageImageManager({
  config,
  value,
  onChange,
  className,
}: StorageImageManagerProps) {
  const parsedConfig = parseStorageImageManagerConfig(config);
  const maxItems = Math.max(1, parsedConfig.maxItems);
  const images = normalizeImages(value, maxItems);
  const slots = Array.from(
    { length: maxItems },
    (_, index) => images[index] ?? null,
  );

  return (
    <div
      className={cn(
        maxItems > 1 ? "grid gap-3 sm:grid-cols-3 lg:grid-cols-1" : "space-y-3",
        className,
      )}
    >
      {slots.map((image, index) => (
        <StorageImageSlot
          key={`${parsedConfig.id}-${index}`}
          config={parsedConfig}
          image={image}
          index={index}
          onUploaded={(itemIndex, uploadedImage) => {
            onChange(
              normalizeImages(
                replaceAt(images, itemIndex, uploadedImage),
                maxItems,
              ),
            );
          }}
          onRemoved={(itemIndex) => {
            onChange(normalizeImages(removeAt(images, itemIndex), maxItems));
          }}
        />
      ))}
    </div>
  );
}
