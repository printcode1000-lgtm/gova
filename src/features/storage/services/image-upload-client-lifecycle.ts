"use client";

import { clearImageUploadDrafts } from "./image-upload-draft-service";
import { imageUploadQueue } from "./image-upload-queue";

let clearingPromise: Promise<void> | null = null;

export async function clearImageUploadClientState(): Promise<void> {
  imageUploadQueue.clear();
  if (!clearingPromise) {
    clearingPromise = clearImageUploadDrafts().finally(() => {
      clearingPromise = null;
    });
  }
  await clearingPromise;
}
