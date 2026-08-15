export type BackgroundDownloadStatus =
  | "pending"
  | "downloading"
  | "verifying"
  | "completed"
  | "failed"
  | "missing"
  | "cancelled"
  | "paused";

export type DownloadState = BackgroundDownloadStatus;

export interface BackgroundDownloadTask {
  id: string;
  url: string;
  destinationPath: string;
  bytesDownloaded: number;
  totalBytes: number;
  state: DownloadState;
  status?: BackgroundDownloadStatus;
  releaseId?: string;
  error?: string;
}

export interface StartDownloadOptions {
  id?: string;
  releaseId?: string;
  url: string;
  destinationPath?: string;
  headers?: Record<string, string>;
  title?: string;
  description?: string;
  expectedSha256?: string;
  expectedBytes?: number;
  sha256?: string;
  size?: number;
}

export interface BackgroundDownloadProgress {
  id: string;
  bytesDownloaded: number;
  totalBytes: number;
  state: DownloadState;
}
