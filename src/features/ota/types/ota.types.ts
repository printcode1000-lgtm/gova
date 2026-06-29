export interface OtaManifestPayload {
  schemaVersion: number;
  releaseId: string;
  version: string;
  createdAt: string;
  bundleUrl: string;
  size: number;
  sha256: string;
  minimumNativeVersion: string;
  mandatory: boolean;
  notes: string;
}

export interface OtaManifest extends OtaManifestPayload {
  signature: string;
}

export interface DownloadedOtaUpdate {
  version: string;
  releaseId: string;
  path: string;
  size: number;
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
};
