/** Single responsibility: describe one resilient native background download task. */
export interface BackgroundDownloadRequest {
  releaseId: string;
  url: string;
  sha256: string;
  size: number;
}

export type BackgroundDownloadStatus =
  | "pending"
  | "downloading"
  | "completed"
  | "failed"
  | "missing";

export interface BackgroundDownloadTask {
  id: string;
  releaseId: string;
  status: BackgroundDownloadStatus;
  bytesDownloaded: number;
  totalBytes: number;
  filePath?: string;
  error?: string;
}

export type BackgroundDownloadChunkConsumer = (
  chunk: Uint8Array,
) => Promise<void> | void;
