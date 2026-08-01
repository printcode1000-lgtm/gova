/**
 * Files module contract.
 *
 * Single responsibility: describe application storage and user file access.
 * Platform paths (content://, file:///data/user/0/…) never appear here.
 */

/** Where an application file lives. Callers choose intent, not a path. */
export const StorageAreas = {
  /** Private, persistent, excluded from backups. Survives app restarts. */
  Data: "data",
  /** Private, disposable. The OS may reclaim it under storage pressure. */
  Cache: "cache",
} as const;

export type StorageArea = (typeof StorageAreas)[keyof typeof StorageAreas];

/** Normalized user-selected file. Always carries real bytes. */
export interface PickedFile {
  /** Original file name reported by the OS. */
  name: string;
  mimeType: string;
  byteSize: number;
  /** Browser `File` the application can upload or read directly. */
  file: File;
}

export interface PickFilesOptions {
  /** Allow more than one selection. Default `false`. */
  multiple?: boolean;
  /** MIME types to accept, e.g. `["application/pdf"]`. */
  accept?: string[];
  /** Upper bound when `multiple` is true. */
  limit?: number;
}

export interface SaveToDeviceOptions {
  fileName: string;
  mimeType?: string;
}

export interface WriteFileOptions {
  area?: StorageArea;
  /** Create missing parent directories. Default `true`. */
  recursive?: boolean;
}

export interface AppFileInfo {
  path: string;
  byteSize: number;
  /** Epoch milliseconds of the last modification, when reported. */
  modifiedAt: number | null;
}

/** Common accept groups so callers do not hardcode MIME strings. */
export const AcceptPresets = {
  Images: ["image/*"],
  Pdf: ["application/pdf"],
  Documents: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
  ],
  Any: ["*/*"],
} as const;
