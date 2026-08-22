"use client";

import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Camera, Image as ImageIcon, Images, X } from "lucide-react";
import {
  StorageProfiles,
  type StorageProfileId,
  type StoredImage,
} from "@asol/storage-core";
import { NativeCore } from "@asol/native-core";
import { useStorageProfileUpload } from "../hooks/use-storage-profile-upload";
import { imageUploadQueue } from "../services/image-upload-queue";
import {
  buildImageUploadDraftKey,
  createImageUploadDraft,
  deleteImageUploadDraft,
  getImageUploadDraft,
  imageUploadDraftToFile,
  subscribeImageUploadDraft,
  type ImageUploadDraft,
  type ImageUploadDraftStatus,
} from "../services/image-upload-draft-service";
import {
  cn,
  defaultTranslate,
  InlineLoadingSpinner,
  ManagerButton,
  StorageImageSlotFrame,
  storageImageEmptyStateClasses,
  storageImageEmptyStateIconClasses,
  storageImageEmptyStateLabelClasses,
  storageImageEmptyStateProgressClasses,
  storageImageSlotSurfaceClasses,
  StorageManagerDialog,
} from "./storage-image-manager-ui";
export type {
  DialogState,
  ManagerStage,
  StorageImageAspectRatio,
  StorageImageManagerConfig,
  StorageImageManagerHandle,
  StorageImageManagerProps,
  StorageImageManagerTranslate,
  StorageImageSlotHandle,
} from "./storage-image-manager.types";
import type {
  DialogState,
  ManagerStage,
  StorageImageAspectRatio,
  StorageImageManagerConfig,
  StorageImageManagerHandle,
  StorageImageManagerProps,
  StorageImageManagerTranslate,
  StorageImageSlotHandle,
} from "./storage-image-manager.types";

const storageProfileIds = new Set<string>(Object.values(StorageProfiles));
const aspectRatioIds = new Set<string>([
  "square",
  "landscape",
  "portrait",
  "wide",
]);

function traceStorageImageManager(
  _configId: string,
  _step: string,
  _details: Record<string, unknown> = {},
) {
  void _configId;
  void _step;
  void _details;
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
    deleteFromStorageOnRemove: config.deleteFromStorageOnRemove !== false,
    storageScope:
      typeof config.storageScope === "string" ? config.storageScope : undefined,
  };
}

function normalizeImages(
  images: StoredImage[],
  maxItems: number,
): StoredImage[] {
  return images
    .filter((image) => image.url || image.isUploading || image.error)
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

const StorageImageSlot = React.forwardRef<
  StorageImageSlotHandle,
  {
    config: StorageImageManagerConfig;
    image: StoredImage | null;
    index: number;
    draftOwnerId: string | null;
    draftPageKey: string | null;
    translate?: StorageImageManagerTranslate;
    onUploaded: (index: number, image: StoredImage) => void;
    onRemoved: (index: number) => void;
    onPendingChange: (index: number, pending: boolean) => void;
    onPreviewChange?: (index: number, previewUrl: string | null) => void;
  }
>(function StorageImageSlot({
  config,
  image,
  index,
  draftOwnerId,
  draftPageKey,
  translate,
  onUploaded,
  onRemoved,
  onPendingChange,
  onPreviewChange,
}, ref) {
  const t = translate ?? defaultTranslate;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const imageRef = React.useRef<HTMLImageElement>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [selectedDraftId, setSelectedDraftId] = React.useState<string | null>(
    null,
  );
  const [selectedPreviewUrl, setSelectedPreviewUrl] = React.useState<
    string | null
  >(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isChoosingSource, setIsChoosingSource] = React.useState(false);
  const [sourceError, setSourceError] = React.useState<string | null>(null);
  const [storedPreviewFailed, setStoredPreviewFailed] = React.useState(false);
  const [stage, setStage] = React.useState<ManagerStage>("idle");
  const [dialog, setDialog] = React.useState<DialogState>(null);
  const [uploadedImage, setUploadedImage] = React.useState<StoredImage | null>(
    null,
  );
  const [draftStatus, setDraftStatus] =
    React.useState<ImageUploadDraftStatus | null>(null);
  const [draftQueuePosition, setDraftQueuePosition] = React.useState(0);
  const draftReadSequenceRef = React.useRef(0);
  const activeUploadDraftIdRef = React.useRef<string | null>(null);
  const activeUploadPromiseRef = React.useRef<Promise<boolean> | null>(null);
  const hydratedDraftIdRef = React.useRef<string | null>(null);
  const onUploadedRef = React.useRef(onUploaded);
  const onPendingChangeRef = React.useRef(onPendingChange);
  React.useEffect(() => {
    onUploadedRef.current = onUploaded;
  }, [onUploaded]);
  React.useEffect(() => {
    onPendingChangeRef.current = onPendingChange;
  }, [onPendingChange]);
  const onPreviewChangeRef = React.useRef(onPreviewChange);
  React.useEffect(() => {
    onPreviewChangeRef.current = onPreviewChange;
  }, [onPreviewChange]);
  React.useEffect(() => {
    onPreviewChangeRef.current?.(index, selectedPreviewUrl);
  }, [index, selectedPreviewUrl]);

  const draftKey = React.useMemo(
    () =>
      draftOwnerId && draftPageKey
        ? buildImageUploadDraftKey({
            ownerId: draftOwnerId,
            pageKey: draftPageKey,
            managerId: config.id,
            slotIndex: index,
            storageProfileId: config.storageProfileId,
            storageScope: config.storageScope,
          })
        : null,
    [
      config.id,
      config.storageProfileId,
      config.storageScope,
      draftOwnerId,
      draftPageKey,
      index,
    ],
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
    setStoredPreviewFailed(false);
  }, [config.id, imageKey, imageUrl, isImageUploading, imageError, index]);

  const applyDraft = React.useCallback(
    async (draft: ImageUploadDraft | null) => {
      const sequence = ++draftReadSequenceRef.current;
      if (!draft) {
        hydratedDraftIdRef.current = null;
        setSelectedFile(null);
        setSelectedDraftId(null);
        setSelectedPreviewUrl(null);
        setDraftStatus(null);
        setDraftQueuePosition(0);
        return;
      }

      if (draft.status === "completed" && draft.uploadedImage) {
        if (activeUploadDraftIdRef.current === draft.draftId) return;
        hydratedDraftIdRef.current = null;
        setUploadedImage(draft.uploadedImage);
        onUploadedRef.current(index, draft.uploadedImage);
        setSelectedFile(null);
        setSelectedDraftId(null);
        setSelectedPreviewUrl(null);
        setDraftStatus(null);
        setDraftQueuePosition(0);
        setStage("loadingImage");
        await deleteImageUploadDraft(draft.key, draft.draftId);
        return;
      }

      if (hydratedDraftIdRef.current === draft.draftId) {
        setDraftStatus(draft.status);
        setDraftQueuePosition(draft.queuePosition);
        setSourceError(draft.error ?? null);
        if (draft.status === "queued") setStage("queued");
        else if (draft.status === "uploading") setStage("uploading");
        else setStage("ready");
        return;
      }

      const file = imageUploadDraftToFile(draft);
      const preview = await fileToDataUrl(file);
      if (sequence !== draftReadSequenceRef.current) return;
      hydratedDraftIdRef.current = draft.draftId;
      setSelectedFile(file);
      setSelectedDraftId(draft.draftId);
      setSelectedPreviewUrl(preview);
      setDraftStatus(draft.status);
      setDraftQueuePosition(draft.queuePosition);
      setSourceError(draft.error ?? null);
      if (draft.status === "queued") setStage("queued");
      else if (draft.status === "uploading") setStage("uploading");
      else setStage("ready");
    },
    [index],
  );

  React.useEffect(() => {
    if (!draftKey) return;
    let active = true;
    const receiveDraft = (draft: ImageUploadDraft | null) => {
      if (!active) return;
      void applyDraft(draft).catch((draftError) => {
        console.error(
          `[StorageImageManager:${config.id}] draft-restore-failed`,
          draftError,
        );
        if (active) setSourceError("draftRestoreFailed");
      });
    };
    const unsubscribe = subscribeImageUploadDraft(draftKey, receiveDraft);
    void getImageUploadDraft(draftKey).then(receiveDraft);
    return () => {
      active = false;
      draftReadSequenceRef.current += 1;
      unsubscribe();
    };
  }, [applyDraft, config.id, draftKey]);

  const {
    uploadFile,
    removeImage,
    isUploading,
    error,
    queueStatus,
    queuePosition,
    cancelUpload,
  } = useStorageProfileUpload({
    storageProfileId: config.storageProfileId,
    storageScope: config.storageScope,
    queueOwnerId: `${config.id}-${index}`,
    draftKey,
    value: selectedFile ? uploadedImage : image,
    onChange: (nextImage) => {
      traceStorageImageManager(config.id, "upload-state-change", {
        index,
        isUploading: Boolean(nextImage?.isUploading),
        imageKey: nextImage?.imageKey ?? null,
        hasUrl: Boolean(nextImage?.url),
        error: nextImage?.error ?? null,
      });
      if (nextImage?.isUploading) {
        setUploadedImage(nextImage);
        onUploaded(index, nextImage);
        return;
      }
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
    selectedPreviewUrl ??
    (storedPreviewFailed ? null : (uploadedImage?.url ?? image?.url ?? null));
  const displayError = sourceError ?? error;
  const durableUploadActive =
    draftStatus === "queued" || draftStatus === "uploading";
  const busy =
    isUploading ||
    image?.isUploading ||
    isChoosingSource ||
    durableUploadActive;
  const isQueued = queueStatus === "queued" || draftStatus === "queued";
  const canChoose = Boolean(draftKey) && !previewUrl;
  const effectiveQueuePosition = queuePosition || draftQueuePosition;
  const stageLabels: Partial<Record<ManagerStage, string>> = {
    selecting: t("storage.imageManager.stage.selecting"),
    detecting: t("storage.imageManager.stage.detecting"),
    converting: t("storage.imageManager.stage.converting"),
    reading: t("storage.imageManager.stage.reading"),
    previewing: t("storage.imageManager.stage.previewing"),
    queued: t("storage.imageManager.stage.queued", {
      position: effectiveQueuePosition,
    }),
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
      message: sourceError ?? t("storage.imageManager.operationError"),
    });
  }, [displayError, selectedFile, sourceError, t]);

  const runUploadCandidate = async (file: File) => {
    if (!selectedDraftId) return false;
    const uploadingDraftId = selectedDraftId;
    activeUploadDraftIdRef.current = uploadingDraftId;
    traceStorageImageManager(config.id, "upload-started", {
      index,
      name: file.name,
      type: file.type,
      size: file.size,
    });
    try {
      const uploaded = await uploadFile(file, uploadingDraftId);
      if (!uploaded) {
        traceStorageImageManager(config.id, "upload-failed", { index });
        setStage("ready");
        return false;
      }
      traceStorageImageManager(config.id, "upload-completed", { index });
      setStage("loadingImage");
      setSelectedFile(null);
      setSelectedDraftId(null);
      setSelectedPreviewUrl(null);
      return true;
    } finally {
      if (activeUploadDraftIdRef.current === uploadingDraftId) {
        activeUploadDraftIdRef.current = null;
      }
    }
  };

  const uploadCandidate = React.useCallback(
    (file: File) => {
      if (activeUploadPromiseRef.current) return activeUploadPromiseRef.current;
      const promise = runUploadCandidate(file).finally(() => {
        if (activeUploadPromiseRef.current === promise) {
          activeUploadPromiseRef.current = null;
        }
      });
      activeUploadPromiseRef.current = promise;
      return promise;
    },
    [runUploadCandidate],
  );

  const pending = Boolean(
    selectedFile ||
      selectedDraftId ||
      draftStatus === "queued" ||
      draftStatus === "uploading",
  );

  React.useEffect(() => {
    onPendingChangeRef.current(index, pending);
    return () => onPendingChangeRef.current(index, false);
  }, [index, pending]);

  React.useImperativeHandle(
    ref,
    () => ({
      hasPending: () => pending,
      uploadPending: async () => {
        if (activeUploadPromiseRef.current) {
          return activeUploadPromiseRef.current;
        }
        if (!selectedFile) return !pending;
        return uploadCandidate(selectedFile);
      },
    }),
    [pending, selectedFile, uploadCandidate],
  );

  React.useEffect(() => {
    if (
      !draftKey ||
      !selectedFile ||
      !selectedDraftId ||
      isUploading ||
      (draftStatus !== "queued" && draftStatus !== "uploading") ||
      imageUploadQueue.has(draftKey)
    ) {
      return;
    }
    void uploadCandidate(selectedFile);
  }, [draftKey, draftStatus, isUploading, selectedDraftId, selectedFile]);

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
    try {
      setStage("reading");
      traceStorageImageManager(config.id, "preview-read-started", { index });
      const preview = await fileToDataUrl(normalizedFile);
      setStage("previewing");
      if (!draftKey || !draftOwnerId || !draftPageKey) {
        throw new Error("Image draft storage is not ready");
      }
      const draft = await createImageUploadDraft({
        key: draftKey,
        ownerId: draftOwnerId,
        pageKey: draftPageKey,
        managerId: config.id,
        slotIndex: index,
        storageProfileId: config.storageProfileId,
        storageScope: config.storageScope,
        file: normalizedFile,
      });
      hydratedDraftIdRef.current = draft.draftId;
      setSelectedFile(normalizedFile);
      setSelectedDraftId(draft.draftId);
      setDraftStatus("ready");
      setDraftQueuePosition(0);
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
      setSelectedDraftId(null);
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
      native: NativeCore.isNative(),
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

    if (!NativeCore.isNative()) {
      inputRef.current?.click();
      traceStorageImageManager(config.id, "web-file-picker-opened", { index });
      return;
    }

    setStage("selecting");
    setIsChoosingSource(true);
    try {
      const res = await NativeCore.pickImages({ limit: 1 });
      if (res.ok) {
        const image = res.value[0];
        traceStorageImageManager(config.id, "native-file-picker-returned", {
          index,
          selected: Boolean(image?.file),
        });
        if (image?.file) await processFile(image.file);
        else setStage("idle");
      } else {
        if (res.error.isPermissionDenied()) {
          setDialog({
            kind: "permission",
            title: t("storage.imageSource.photoPermissionTitle"),
            message: t("storage.imageSource.photoPermissionSettings"),
            actionLabel: t("storage.imageSource.openSettings"),
            onConfirm: () => {
              // `ok` means the call completed, not that a screen appeared —
              // a host with no settings screen answers `ok(false)`.
              void NativeCore.openAppSettings().then((openRes: { ok: boolean; value?: boolean }) => {
                if (!openRes.ok || !openRes.value) {
                  setSourceError(t("storage.imageSource.error"));
                }
              });
            },
          });
        } else if (res.error.isCancelled()) {
          setStage("idle");
        } else {
          setSourceError(t("storage.imageSource.error"));
        }
      }
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
      native: NativeCore.isNative(),
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

    if (!NativeCore.isNative()) {
      cameraInputRef.current?.click();
      traceStorageImageManager(config.id, "web-camera-picker-opened", {
        index,
      });
      return;
    }

    setStage("selecting");
    setIsChoosingSource(true);
    try {
      const res = await NativeCore.takePhoto({});
      if (res.ok) {
        const image = res.value;
        traceStorageImageManager(config.id, "native-camera-returned", {
          index,
          selected: Boolean(image?.file),
        });
        if (image?.file) await processFile(image.file);
        else setStage("idle");
      } else {
        if (res.error.isPermissionDenied()) {
          setDialog({
            kind: "permission",
            title: t("storage.imageSource.cameraPermissionTitle"),
            message: t("storage.imageSource.cameraPermissionSettings"),
            actionLabel: t("storage.imageSource.openSettings"),
            onConfirm: () => {
              // `ok` means the call completed, not that a screen appeared —
              // a host with no settings screen answers `ok(false)`.
              void NativeCore.openAppSettings().then((openRes: { ok: boolean; value?: boolean }) => {
                if (!openRes.ok || !openRes.value) {
                  setSourceError(t("storage.imageSource.cameraError"));
                }
              });
            },
          });
        } else if (res.error.isCancelled()) {
          setStage("idle");
        } else {
          setSourceError(t("storage.imageSource.cameraError"));
        }
      }
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

  const removeCurrent = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const clearSelected = () => {
      if (isQueued) cancelUpload();
      traceStorageImageManager(config.id, "selected-file-cleared", { index });
      const draftId = selectedDraftId;
      hydratedDraftIdRef.current = null;
      setSelectedFile(null);
      setSelectedDraftId(null);
      setSelectedPreviewUrl(null);
      setDraftStatus(null);
      setDraftQueuePosition(0);
      setStage("idle");
      if (draftKey) void deleteImageUploadDraft(draftKey, draftId ?? undefined);
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
    // Removal is staged work: the page-save dialog carries the delete copy.
    if (selectedFile) clearSelected();
    else removeStored();
  };

  return (
    <div
      className={cn(
        storageImageSlotSurfaceClasses,
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
              const storedImageFailed = !selectedPreviewUrl;
              if (storedImageFailed) {
                setStoredPreviewFailed(true);
                console.warn(
                  `[StorageImageManager:${config.id}] stored-image-unavailable`,
                  { imageKey: image?.imageKey ?? null },
                );
              } else {
                console.warn(
                  `[StorageImageManager:${config.id}] selected-image-preview-unavailable`,
                );
              }
              setSourceError(t("storage.imageManager.previewError"));
            }}
          />
          {showProgress && (
            <div className="absolute inset-0 flex min-h-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-lg bg-background/80 px-1.5 py-1 text-center">
              <InlineLoadingSpinner size="md" />
              <p className={storageImageEmptyStateProgressClasses}>
                {stageLabels[stage]}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={removeCurrent}
            disabled={busy && !isQueued}
            aria-label={t("storage.imageManager.remove")}
            className="absolute right-2 top-2 rounded-full bg-background p-1.5 shadow-md transition-colors disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </>
      ) : (
        <DropdownMenu.Root>
          <div className={storageImageEmptyStateClasses}>
            <span className={storageImageEmptyStateIconClasses}>
              {showProgress ? (
                <InlineLoadingSpinner size="sm" />
              ) : (
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
              )}
            </span>
            {showProgress ? (
              <span className={storageImageEmptyStateProgressClasses}>
                {stageLabels[stage]}
              </span>
            ) : (
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  disabled={busy}
                  aria-label={t("storage.imageSource.open")}
                  className={storageImageEmptyStateLabelClasses}
                >
                  {t("storage.imageSource.open")}
                </button>
              </DropdownMenu.Trigger>
            )}
          </div>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="center"
              className="z-50 min-w-56 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
            >
              <DropdownMenu.Label className="px-2 py-1.5 text-sm font-semibold">
                {t("storage.imageSource.title")}
              </DropdownMenu.Label>
              <DropdownMenu.Item
                className="flex w-full items-center gap-3 rounded-sm px-2 py-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onSelect={() => void chooseFromDevice()}
              >
                <Images className="h-5 w-5 text-primary" aria-hidden="true" />
                {t("storage.imageSource.device")}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className="flex w-full items-center gap-3 rounded-sm px-2 py-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onSelect={() => void captureFromCamera()}
              >
                <Camera className="h-5 w-5 text-primary" aria-hidden="true" />
                {t("storage.imageSource.camera")}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
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
});

export const StorageImageManager = React.forwardRef<
  StorageImageManagerHandle,
  StorageImageManagerProps
>(function StorageImageManager({
  config,
  value,
  onChange,
  className,
  label,
  hint,
  onPendingChange,
  onPreviewChange,
  translate,
  draftOwnerId: providedDraftOwnerId,
  draftPageKey: providedDraftPageKey,
}, ref) {
  const [currentPageKey, setCurrentPageKey] = React.useState<string | null>(
    providedDraftPageKey ?? null,
  );
  React.useEffect(() => {
    if (providedDraftPageKey !== undefined) {
      setCurrentPageKey(providedDraftPageKey);
      return;
    }
    setCurrentPageKey(window.location.pathname);
  }, [providedDraftPageKey]);
  const draftOwnerId =
    providedDraftOwnerId === undefined ? "guest" : providedDraftOwnerId;
  const draftPageKey = currentPageKey;
  const parsedConfig = parseStorageImageManagerConfig(config);
  const maxItems = Math.max(1, parsedConfig.maxItems);
  const images = normalizeImages(value, maxItems);
  const slotRefs = React.useRef<Array<StorageImageSlotHandle | null>>([]);
  const [pendingSlots, setPendingSlots] = React.useState<Set<number>>(
    () => new Set(),
  );
  const slots = Array.from(
    { length: maxItems },
    (_, index) => images[index] ?? null,
  );

  const hasPending = pendingSlots.size > 0;
  const onPendingChangeRef = React.useRef(onPendingChange);
  React.useEffect(() => {
    onPendingChangeRef.current = onPendingChange;
  }, [onPendingChange]);
  React.useEffect(() => {
    onPendingChangeRef.current?.(hasPending);
  }, [hasPending]);

  React.useImperativeHandle(
    ref,
    () => ({
      hasPending: () => slotRefs.current.some((slot) => slot?.hasPending()),
      uploadPending: async () => {
        const pendingManagers = slotRefs.current.filter(
          (slot): slot is StorageImageSlotHandle => Boolean(slot?.hasPending()),
        );
        for (const manager of pendingManagers) {
          if (!(await manager.uploadPending())) return false;
        }
        return true;
      },
    }),
    [],
  );

  return (
    <div className="space-y-2">
      {label ? (
        <p className="text-sm font-medium text-on-surface">{label}</p>
      ) : null}
      <div
        className={cn(
          maxItems > 1
            ? "grid gap-3 sm:grid-cols-3 lg:grid-cols-1"
            : "space-y-3",
          className,
        )}
      >
        {slots.map((image, index) => (
          <StorageImageSlotFrame
            key={`${parsedConfig.id}-${index}-frame`}
            aspectRatio={parsedConfig.aspectRatio}
          >
            <StorageImageSlot
              ref={(handle) => {
                slotRefs.current[index] = handle;
              }}
              key={`${parsedConfig.id}-${index}`}
              config={parsedConfig}
              image={image}
              index={index}
              draftOwnerId={draftOwnerId}
              draftPageKey={draftPageKey}
              translate={translate}
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
              onPendingChange={(itemIndex, pending) => {
                setPendingSlots((current) => {
                  if (current.has(itemIndex) === pending) return current;
                  const next = new Set(current);
                  if (pending) next.add(itemIndex);
                  else next.delete(itemIndex);
                  return next;
                });
              }}
              onPreviewChange={onPreviewChange}
            />
          </StorageImageSlotFrame>
        ))}
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
});
