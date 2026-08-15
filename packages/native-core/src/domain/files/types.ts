export interface PickFilesOptions {
  types?: readonly string[];
  multiple?: boolean;
  readData?: boolean;
}

export interface PickedFile {
  name: string;
  mimeType: string;
  size: number;
  data?: string;
  path?: string;
  file?: File;
  blob?: Blob;
}

export interface PickFilesResult {
  files: readonly PickedFile[];
}

export interface SaveFileOptions {
  fileName: string;
  data: string | Uint8Array | Blob;
  mimeType?: string;
  directory?: string;
}

export interface SaveFileResult {
  uri: string;
}

export interface ReadFileOptions {
  path: string;
  directory?: string;
}

export interface ReadFileResult {
  data: string;
}

export interface DeleteFileOptions {
  path: string;
  directory?: string;
}

/**
 * A file the application already wrote, to be handed to an external viewer.
 *
 * `path` is sandbox-relative; the opaque OS URI is resolved inside the adapter
 * and never crosses the public boundary. Defaults to the cache area, which is
 * where staged outbox files live.
 */
export interface OpenFileExternallyOptions {
  path: string;
  directory?: string;
}
