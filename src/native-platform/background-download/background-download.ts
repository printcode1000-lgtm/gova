/** Single responsibility: expose resilient bundle downloads without leaking plugins. */
import { NativePlatformError } from "../core/errors";
import { isNativePlatform } from "../core/platform";
import { Capacitor } from "@capacitor/core";
import {
  nativeBackgroundDownloadStatus,
  readNativeBackgroundDownload,
  removeNativeBackgroundDownload,
  scheduleNativeBackgroundDownload,
} from "./background-download-native-adapter";
import type {
  BackgroundDownloadChunkConsumer,
  BackgroundDownloadRequest,
  BackgroundDownloadTask,
} from "./types";

export class BackgroundDownloadModule {
  isAvailable(): boolean {
    return isNativePlatform() && Capacitor.isPluginAvailable("BackgroundDownload");
  }

  async schedule(request: BackgroundDownloadRequest): Promise<BackgroundDownloadTask> {
    if (!this.isAvailable()) throw NativePlatformError.unavailable("BackgroundDownload");
    return scheduleNativeBackgroundDownload(request);
  }

  async status(releaseId: string): Promise<BackgroundDownloadTask> {
    if (!this.isAvailable()) throw NativePlatformError.unavailable("BackgroundDownload");
    return nativeBackgroundDownloadStatus(releaseId);
  }

  async remove(releaseId: string): Promise<void> {
    if (this.isAvailable()) await removeNativeBackgroundDownload(releaseId);
  }

  async read(
    task: BackgroundDownloadTask,
    consume: BackgroundDownloadChunkConsumer,
  ): Promise<void> {
    if (!this.isAvailable()) throw NativePlatformError.unavailable("BackgroundDownload");
    await readNativeBackgroundDownload(task, consume);
  }
}

export const backgroundDownload = new BackgroundDownloadModule();
