export interface OtaFileEntry {
  sha256: string;
  size: number;
}

export interface OtaManifestPayload {
  schemaVersion: number;
  delivery: 'files';
  releaseId: string;
  version: string;
  createdAt: string;
  baseUrl: string;
  size: number;
  fileCount: number;
  minimumNativeVersion: string;
  mandatory: boolean;
  notes: string;
  files: Record<string, OtaFileEntry>;
}

export interface OtaManifest extends OtaManifestPayload {
  signature?: string;
}

export interface DownloadedOtaUpdate {
  version: string;
  releaseId: string;
  path: string;
  size: number;
  changedFileCount: number;
  deletedFileCount: number;
  notes: string;
  downloadedAt: number;
  dismissedAt?: number;
}

export interface OtaStoredState {
  pending?: DownloadedOtaUpdate;
  failedReleaseId?: string;
  activation?: {
    version: string;
    previousPath: string;
    startedAt: number;
  };
}

export type OtaDownloadProgress = {
  progress: number;
  statusKey: string;
  detail?: string;
  currentVersion?: string;
  remoteVersion?: string;
  changedFileCount?: number;
  deletedFileCount?: number;
  downloadBytes?: number;
};
