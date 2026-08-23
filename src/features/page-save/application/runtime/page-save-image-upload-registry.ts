"use client";

import * as React from "react";

import type { StorageImageManagerHandle } from "@/features/storage/ui";

type ImageUploadHandle = Pick<
  StorageImageManagerHandle,
  "hasPending" | "uploadPending"
>;

const handles = new Map<string, ImageUploadHandle>();

export function registerPageSaveImageUploadHandle(
  id: string,
  handle: ImageUploadHandle | null,
): () => void {
  if (handle) handles.set(id, handle);
  else handles.delete(id);
  return () => {
    handles.delete(id);
  };
}

export function pageSaveImageUploadHasPending(id: string): boolean {
  return handles.get(id)?.hasPending() ?? false;
}

export async function uploadPageSaveImageUploadHandle(
  id: string,
): Promise<boolean> {
  const handle = handles.get(id);
  if (!handle?.hasPending()) return true;
  return handle.uploadPending();
}

export async function uploadPageSaveImageUploadHandles(
  ids: string[],
): Promise<boolean> {
  for (const id of ids) {
    if (!(await uploadPageSaveImageUploadHandle(id))) return false;
  }
  return true;
}

export function resetPageSaveImageUploadHandlesForTests(): void {
  handles.clear();
}
