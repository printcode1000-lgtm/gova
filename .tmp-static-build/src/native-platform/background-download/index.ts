/** Single responsibility: expose the native background-download contract. */
export { backgroundDownload, BackgroundDownloadModule } from "./background-download";
export type {
  BackgroundDownloadChunkConsumer,
  BackgroundDownloadRequest,
  BackgroundDownloadStatus,
  BackgroundDownloadTask,
} from "./types";
