import type * as React from "react";

import type { StorageProfileId, StoredImage } from "@asol/storage-core";

export type StorageImageAspectRatio =
  | "square"
  | "landscape"
  | "portrait"
  | "wide";

export interface StorageImageManagerConfig {
  id: string;
  storageProfileId: StorageProfileId;
  maxItems: number;
  aspectRatio: StorageImageAspectRatio;
  allowReplace: boolean;
  deleteFromStorageOnRemove?: boolean;
  storageScope?: string;
}

export type StorageImageManagerTranslate = (
  key: string,
  values?: Record<string, string | number>,
) => string;

export interface StorageImageManagerProps {
  config: StorageImageManagerConfig;
  value: StoredImage[];
  onChange: (images: StoredImage[]) => void;
  className?: string;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  onPendingChange?: (pending: boolean) => void;
  onPreviewChange?: (slotIndex: number, previewUrl: string | null) => void;
  translate?: StorageImageManagerTranslate;
  draftOwnerId?: string | null;
  draftPageKey?: string | null;
}

export interface StorageImageManagerHandle {
  hasPending: () => boolean;
  uploadPending: () => Promise<boolean>;
}

export interface StorageImageSlotHandle extends StorageImageManagerHandle {}

export type ManagerStage =
  | "idle"
  | "queued"
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

export type DialogState =
  | {
      kind: "confirm" | "permission";
      title: string;
      message: string;
      actionLabel?: string;
      onConfirm: () => void;
    }
  | {
      kind: "error";
      title: string;
      message: string;
    }
  | null;
