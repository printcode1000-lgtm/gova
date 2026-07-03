"use client";

import * as React from "react";
import { Camera, Image as ImageIcon, Images, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
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
  storageScope?: string;
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

type ManagerStage =
  | "idle"
  | "selecting"
  | "detecting"
  | "converting"
  | "reading"
  | "previewing"
  | "ready"
  | "profile"
  | "compressing"
  | "uploading"
  | "finalizing"
  | "loadingImage"
  | "deleting";

type DialogState = {
  kind: "confirm" | "error";
  title: string;
  message: string;
  onConfirm?: () => void;
} | null;

function StorageManagerDialog({
  state,
  onClose,
  confirmLabel,
  cancelLabel,
  closeLabel,
}: {
  state: DialogState;
  onClose: () => void;
  confirmLabel: string;
  cancelLabel: string;
  closeLabel: string;
}) {
  if (!state) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-xl border bg-background p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="storage-dialog-title"
      >
        <h2 id="storage-dialog-title" className="text-lg font-semibold">
          {state.title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{state.message}</p>
        <div className="mt-5 flex justify-end gap-2">
          {state.kind === "confirm" ? (
            <>
              <Button type="button" variant="secondary" onClick={onClose}>
                {cancelLabel}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const action = state.onConfirm;
                  onClose();
                  action?.();
                }}
              >
                {confirmLabel}
              </Button>
            </>
          ) : (
            <Button type="button" onClick={onClose}>
              {closeLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

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

async function normalizeSelectedImageFile(
  file: File,
  onStage?: (stage: ManagerStage) => void,
): Promise<File> {
  onStage?.("detecting");
  const maybeHeic =
    !file.type || /hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
  if (maybeHeic) {
    traceStorageImageManager("heic", "format-detection-started", {
      name: file.name,
      browserType: file.type || null,
      size: file.size,
    });
    const { heicTo, isHeic } = await import("heic-to/csp");
    if (await isHeic(file)) {
      onStage?.("converting");
      traceStorageImageManager("heic", "conversion-started", {
        name: file.name,
        inputBytes: file.size,
      });
      const jpeg = await heicTo({
        blob: file,
        type: "image/jpeg",
        quality: 0.92,
      });
      const baseName = file.name.replace(/\.[^.]+$/, "") || "selected-image";
      traceStorageImageManager("heic", "conversion-completed", {
        outputBytes: jpeg.size,
        outputType: jpeg.type,
      });
      return new File([jpeg], `${baseName}.jpg`, {
        type: "image/jpeg",
        lastModified: file.lastModified,
      });
    }
    traceStorageImageManager("heic", "format-detection-negative", {
      name: file.name,
    });
  }

  if (file.type.startsWith("image/")) return file;

  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  let mimeType: string | null = null;
  let extension: string | null = null;

  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    mimeType = "image/jpeg";
    extension = "jpg";
  } else if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    mimeType = "image/png";
    extension = "png";
  } else if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    mimeType = "image/webp";
    extension = "webp";
  } else if (
    bytes.length >= 6 &&
    String.fromCharCode(...bytes.slice(0, 6)).startsWith("GIF8")
  ) {
    mimeType = "image/gif";
    extension = "gif";
  }

  if (!mimeType || !extension) {
    throw new Error(
      `The selected file has no browser MIME type and its bytes are not a supported JPEG, PNG, WebP, or GIF image: ${file.name}`,
    );
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "selected-image";
  return new File([file], `${baseName}.${extension}`, {
    type: mimeType,
    lastModified: file.lastModified,
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
  if (
    config.storageScope !== undefined &&
    (typeof config.storageScope !== "string" ||
      !/^[A-Za-z0-9-]+$/.test(config.storageScope))
  ) {
    throw new Error(`Invalid storageScope for ${config.id}`);
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
    storageScope:
      typeof config.storageScope === "string" ? config.storageScope : undefined,
  };
}

function normalizeImages(
  images: StoredImage[],
  maxItems: number,
): StoredImage[] {
  return images.filter((image) => image.url).slice(0, maxItems);
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
  const imageRef = React.useRef<HTMLImageElement>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = React.useState<
    string | null
  >(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isChoosingSource, setIsChoosingSource] = React.useState(false);
  const [sourceError, setSourceError] = React.useState<string | null>(null);
  const [stage, setStage] = React.useState<ManagerStage>("idle");
  const [dialog, setDialog] = React.useState<DialogState>(null);
  const [uploadedImage, setUploadedImage] = React.useState<StoredImage | null>(
    null,
  );

  React.useEffect(() => {
    traceStorageImageManager(config.id, "slot-mounted", {
      index,
      storageProfileId: config.storageProfileId,
      storageScope: config.storageScope,
      hasStoredImage: Boolean(image?.imageKey),
    });
    return () =>
      traceStorageImageManager(config.id, "slot-unmounted", { index });
  }, [config.id, config.storageProfileId, index]);

  const imageKey = image?.imageKey;
  const imageUrl = image?.url;
  const isImageUploading = image?.isUploading;
  const imageError = image?.error;

  React.useEffect(() => {
    traceStorageImageManager(config.id, "value-synchronized", {
      index,
      imageKey: imageKey ?? null,
      hasUrl: Boolean(imageUrl),
    });
    setUploadedImage(image);
  }, [config.id, imageKey, imageUrl, isImageUploading, imageError, index]);

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
      onProgress: setStage,
    });

  // Follow the storage operation result directly. Waiting only for the parent
  // to echo `value` back can leave the final-image stage active when feature
  // persistence is asynchronous.
  const previewUrl =
    selectedPreviewUrl ?? uploadedImage?.url ?? image?.url ?? null;
  const displayError = sourceError ?? error;
  const busy = isUploading || image?.isUploading || isChoosingSource;
  const canChoose = !previewUrl;
  const stageLabels: Partial<Record<ManagerStage, string>> = {
    selecting: t("storage.imageManager.stage.selecting"),
    detecting: t("storage.imageManager.stage.detecting"),
    converting: t("storage.imageManager.stage.converting"),
    reading: t("storage.imageManager.stage.reading"),
    previewing: t("storage.imageManager.stage.previewing"),
    profile: t("storage.imageManager.stage.profile"),
    compressing: t("storage.imageManager.stage.compressing"),
    uploading: t("storage.imageManager.stage.uploading"),
    finalizing: t("storage.imageManager.stage.finalizing"),
    loadingImage: t("storage.imageManager.stage.loadingImage"),
    deleting: t("storage.imageManager.stage.deleting"),
  };
  const showProgress = stage !== "idle" && stage !== "ready";

  React.useEffect(() => {
    if (stage === "loadingImage" && imageRef.current?.complete) {
      setStage("idle");
    }
  }, [stage, imageUrl]);

  React.useEffect(() => {
    if (!displayError) return;
    setStage(selectedFile ? "ready" : "idle");
    setDialog({
      kind: "error",
      title: t("storage.imageManager.errorTitle"),
      message: t("storage.imageManager.operationError"),
    });
  }, [displayError, selectedFile, t]);

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
      setStage("ready");
      return false;
    }
    traceStorageImageManager(config.id, "upload-completed", { index });
    setStage("loadingImage");
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
    let normalizedFile: File;
    try {
      normalizedFile = await normalizeSelectedImageFile(file, setStage);
      traceStorageImageManager(config.id, "file-type-normalized", {
        index,
        originalType: file.type || null,
        detectedType: normalizedFile.type,
        normalizedName: normalizedFile.name,
      });
    } catch (fileTypeError) {
      console.error(
        `[StorageImageManager:${config.id}] file-rejected`,
        fileTypeError,
      );
      setSourceError(t("storage.imageManager.unsupportedFile"));
      return;
    }
    setSourceError(null);
    setSelectedFile(normalizedFile);
    try {
      setStage("reading");
      traceStorageImageManager(config.id, "preview-read-started", { index });
      const preview = await fileToDataUrl(normalizedFile);
      setStage("previewing");
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
      setSourceError(t("storage.imageManager.previewError"));
      setSelectedFile(null);
      setStage("idle");
      return;
    }

    traceStorageImageManager(config.id, "file-staged-for-manual-upload", {
      index,
    });
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

    setStage("selecting");
    setIsChoosingSource(true);
    try {
      const file = await chooseSingleImage();
      traceStorageImageManager(config.id, "native-file-picker-returned", {
        index,
        selected: Boolean(file),
      });
      if (file) await processFile(file);
      else setStage("idle");
    } catch (sourceSelectionError) {
      console.error(
        "[StorageImageManager] Unable to choose an image.",
        sourceSelectionError,
      );
      setSourceError(t("storage.imageSource.error"));
      setStage("idle");
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

    setStage("selecting");
    setIsChoosingSource(true);
    try {
      const file = await captureSingleImage();
      traceStorageImageManager(config.id, "native-camera-returned", {
        index,
        selected: Boolean(file),
      });
      if (file) await processFile(file);
      else setStage("idle");
    } catch (cameraError) {
      console.error(
        "[StorageImageManager] Unable to capture an image.",
        cameraError,
      );
      setSourceError(t("storage.imageSource.cameraError"));
      setStage("idle");
    } finally {
      setIsChoosingSource(false);
    }
  };

  const uploadSelected = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!selectedFile) return;
    const runUpload = () => void uploadCandidate(selectedFile);
    if (!config.confirmUpload) return runUpload();
    setDialog({
      kind: "confirm",
      title: t("storage.imageManager.uploadTitle"),
      message: t("storage.imageManager.confirmUpload"),
      onConfirm: runUpload,
    });
  };

  const removeCurrent = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const clearSelected = () => {
      traceStorageImageManager(config.id, "selected-file-cleared", { index });
      setSelectedFile(null);
      setSelectedPreviewUrl(null);
      setStage("idle");
    };
    const removeStored = () => {
      traceStorageImageManager(config.id, "stored-image-removal-confirmed", {
        index,
        imageKey: image?.imageKey ?? null,
        deleteFromStorage: config.deleteFromStorageOnRemove !== false,
      });
      if (config.deleteFromStorageOnRemove === false) onRemoved(index);
      else void removeImage();
    };
    const action = selectedFile ? clearSelected : removeStored;
    if (!config.confirmRemove) return action();
    setDialog({
      kind: "confirm",
      title: t("storage.imageManager.removeTitle"),
      message: selectedFile
        ? t("storage.imageManager.confirmClearSelected")
        : t("storage.imageManager.confirmRemove"),
      onConfirm: action,
    });
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
            ref={imageRef}
            src={previewUrl}
            alt=""
            className="absolute inset-0 h-full w-full rounded-lg object-cover"
            onLoad={() => {
              traceStorageImageManager(config.id, "preview-rendered", {
                index,
                source: selectedPreviewUrl ? "selected-file" : "stored-image",
              });
              if (stage === "previewing") setStage("ready");
              if (stage === "loadingImage") setStage("idle");
            }}
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
              setSourceError(t("storage.imageManager.previewError"));
            }}
          />
          {showProgress && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-background/80 px-4 text-center">
              <LoadingSpinner size="md" />
              <p className="text-sm font-medium">{stageLabels[stage]}</p>
            </div>
          )}
          <button
            type="button"
            onClick={removeCurrent}
            disabled={busy}
            aria-label={t("storage.imageManager.remove")}
            title={t("storage.imageManager.remove")}
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
              aria-label={t("storage.imageManager.upload")}
              title={t("storage.imageManager.upload")}
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
                {showProgress ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                )}
              </span>
              <span className="text-sm font-medium text-primary">
                {showProgress
                  ? stageLabels[stage]
                  : t("storage.imageSource.open")}
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
          if (file && canChoose) {
            setStage("selecting");
            void processFile(file);
          }
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
          if (file && canChoose) {
            setStage("selecting");
            void processFile(file);
          }
          event.target.value = "";
        }}
        disabled={busy}
      />

      <StorageManagerDialog
        state={dialog}
        onClose={() => setDialog(null)}
        confirmLabel={t("storage.imageManager.confirm")}
        cancelLabel={t("storage.imageManager.cancel")}
        closeLabel={t("storage.imageManager.close")}
      />
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
