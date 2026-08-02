/** Single responsibility: lazily bridge the ASOL native bundle downloader. */
import { registerPlugin } from "@capacitor/core";
import { Filesystem } from "@capacitor/filesystem";

import { base64ToBytes } from "../core/binary";
import { createLazyPlugin } from "../core/lazy-plugin";
import { toNativeError } from "../core/errors";
import type {
  BackgroundDownloadChunkConsumer,
  BackgroundDownloadRequest,
  BackgroundDownloadTask,
} from "./types";

interface BackgroundDownloadBridge {
  schedule(options: BackgroundDownloadRequest): Promise<BackgroundDownloadTask>;
  status(options: { releaseId: string }): Promise<BackgroundDownloadTask>;
  remove(options: { releaseId: string }): Promise<void>;
}

const plugin = createLazyPlugin("BackgroundDownload", async () =>
  registerPlugin<BackgroundDownloadBridge>("BackgroundDownload"),
);

export async function scheduleNativeBackgroundDownload(
  request: BackgroundDownloadRequest,
): Promise<BackgroundDownloadTask> {
  try {
    return await (await plugin.required()).schedule(request);
  } catch (error) {
    throw toNativeError("BackgroundDownload", error);
  }
}

export async function nativeBackgroundDownloadStatus(
  releaseId: string,
): Promise<BackgroundDownloadTask> {
  try {
    return await (await plugin.required()).status({ releaseId });
  } catch (error) {
    throw toNativeError("BackgroundDownload", error);
  }
}

export async function removeNativeBackgroundDownload(
  releaseId: string,
): Promise<void> {
  try {
    await (await plugin.required()).remove({ releaseId });
  } catch (error) {
    throw toNativeError("BackgroundDownload", error);
  }
}

export async function readNativeBackgroundDownload(
  task: BackgroundDownloadTask,
  consume: BackgroundDownloadChunkConsumer,
): Promise<void> {
  if (task.status !== "completed" || !task.filePath) {
    throw new Error("Background download is not complete");
  }
  let chain = Promise.resolve();
  await new Promise<void>((resolve, reject) => {
    void Filesystem.readFileInChunks(
      { path: task.filePath!, chunkSize: 64 * 1024 },
      (result, error) => {
        if (error) {
          reject(error);
          return;
        }
        if (!result || !result.data) {
          chain.then(resolve, reject);
          return;
        }
        const chunk = base64ToBytes(String(result.data));
        chain = chain.then(() => consume(chunk));
      },
    ).catch(reject);
  });
}
