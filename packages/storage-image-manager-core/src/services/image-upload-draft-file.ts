"use client";

/**
 * Materialize picker-backed bytes while their platform read grant is alive.
 * The returned Blob no longer depends on the original File handle.
 */
export async function snapshotImageUploadDraftBlob(file: File): Promise<Blob> {
  const bytes = await file.arrayBuffer();
  return new Blob([bytes], { type: file.type });
}
