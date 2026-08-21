"use client";

import type { StoredImage, StorageProfileId } from "@asol/storage-core";
import {
  ASOL_DB_STORES,
  asolDbClearStore,
  asolDbDelete,
  asolDbGet,
  asolDbSetStructured,
} from "@asol/data-core/browser";

export type ImageUploadDraftStatus =
  | "ready"
  | "queued"
  | "uploading"
  | "failed"
  | "completed";

export interface ImageUploadDraft {
  key: string;
  draftId: string;
  ownerId: string;
  pageKey: string;
  managerId: string;
  slotIndex: number;
  storageProfileId: StorageProfileId;
  storageScope?: string;
  blob: Blob;
  fileName: string;
  fileType: string;
  fileSize: number;
  lastModified: number;
  status: ImageUploadDraftStatus;
  queuePosition: number;
  error?: string;
  uploadedImage?: StoredImage;
  createdAt: string;
  updatedAt: string;
}

interface CreateImageUploadDraftInput {
  key: string;
  ownerId: string;
  pageKey: string;
  managerId: string;
  slotIndex: number;
  storageProfileId: StorageProfileId;
  storageScope?: string;
  file: File;
}

type DraftListener = (draft: ImageUploadDraft | null) => void;

const listeners = new Map<string, Set<DraftListener>>();
const writes = new Map<string, Promise<unknown>>();
let clearing = false;

function createDraftId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function emit(key: string, draft: ImageUploadDraft | null): void {
  listeners.get(key)?.forEach((listener) => listener(draft));
}

function enqueueWrite<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const previous = writes.get(key) ?? Promise.resolve();
  const current = previous.then(operation, operation);
  writes.set(key, current);
  void current.then(
    () => {
      if (writes.get(key) === current) writes.delete(key);
    },
    () => {
      if (writes.get(key) === current) writes.delete(key);
    },
  );
  return current;
}

export function buildImageUploadDraftKey(input: {
  ownerId: string;
  pageKey: string;
  managerId: string;
  slotIndex: number;
  storageProfileId: StorageProfileId;
  storageScope?: string;
}): string {
  return [
    "image-upload-draft-v1",
    input.ownerId,
    input.pageKey,
    input.managerId,
    String(input.slotIndex),
    input.storageProfileId,
    input.storageScope ?? "default",
  ]
    .map((part) => encodeURIComponent(part))
    .join(":");
}

export async function createImageUploadDraft(
  input: CreateImageUploadDraftInput,
): Promise<ImageUploadDraft> {
  clearing = false;
  const now = new Date().toISOString();
  const draft: ImageUploadDraft = {
    key: input.key,
    draftId: createDraftId(),
    ownerId: input.ownerId,
    pageKey: input.pageKey,
    managerId: input.managerId,
    slotIndex: input.slotIndex,
    storageProfileId: input.storageProfileId,
    ...(input.storageScope ? { storageScope: input.storageScope } : {}),
    blob: input.file,
    fileName: input.file.name,
    fileType: input.file.type,
    fileSize: input.file.size,
    lastModified: input.file.lastModified,
    status: "ready",
    queuePosition: 0,
    createdAt: now,
    updatedAt: now,
  };

  return enqueueWrite(input.key, async () => {
    await asolDbSetStructured(
      ASOL_DB_STORES.IMAGE_UPLOAD_DRAFTS,
      input.key,
      draft,
    );
    emit(input.key, draft);
    return draft;
  });
}

export async function getImageUploadDraft(
  key: string,
): Promise<ImageUploadDraft | null> {
  await (writes.get(key) ?? Promise.resolve());
  return asolDbGet<ImageUploadDraft>(ASOL_DB_STORES.IMAGE_UPLOAD_DRAFTS, key);
}

export async function updateImageUploadDraft(
  key: string,
  draftId: string,
  patch: Partial<
    Pick<
      ImageUploadDraft,
      "status" | "queuePosition" | "error" | "uploadedImage"
    >
  >,
): Promise<ImageUploadDraft | null> {
  if (clearing) return null;
  return enqueueWrite(key, async () => {
    if (clearing) return null;
    const current = await asolDbGet<ImageUploadDraft>(
      ASOL_DB_STORES.IMAGE_UPLOAD_DRAFTS,
      key,
    );
    if (!current || current.draftId !== draftId) return null;
    const next: ImageUploadDraft = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    if (patch.error === undefined) delete next.error;
    if (patch.uploadedImage === undefined && patch.status !== "completed") {
      delete next.uploadedImage;
    }
    await asolDbSetStructured(
      ASOL_DB_STORES.IMAGE_UPLOAD_DRAFTS,
      key,
      next,
    );
    emit(key, next);
    return next;
  });
}

export async function deleteImageUploadDraft(
  key: string,
  draftId?: string,
): Promise<boolean> {
  return enqueueWrite(key, async () => {
    if (draftId) {
      const current = await asolDbGet<ImageUploadDraft>(
        ASOL_DB_STORES.IMAGE_UPLOAD_DRAFTS,
        key,
      );
      if (!current || current.draftId !== draftId) return false;
    }
    await asolDbDelete(ASOL_DB_STORES.IMAGE_UPLOAD_DRAFTS, key);
    emit(key, null);
    return true;
  });
}

export async function clearImageUploadDrafts(): Promise<void> {
  clearing = true;
  while (writes.size > 0) {
    await Promise.allSettled([...writes.values()]);
  }
  await asolDbClearStore(ASOL_DB_STORES.IMAGE_UPLOAD_DRAFTS);
  listeners.forEach((keyListeners) =>
    keyListeners.forEach((listener) => listener(null)),
  );
}

export function subscribeImageUploadDraft(
  key: string,
  listener: DraftListener,
): () => void {
  const keyListeners = listeners.get(key) ?? new Set<DraftListener>();
  keyListeners.add(listener);
  listeners.set(key, keyListeners);
  return () => {
    keyListeners.delete(listener);
    if (keyListeners.size === 0) listeners.delete(key);
  };
}

export function imageUploadDraftToFile(draft: ImageUploadDraft): File {
  return new File([draft.blob], draft.fileName, {
    type: draft.fileType,
    lastModified: draft.lastModified,
  });
}
