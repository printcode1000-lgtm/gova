import { registerPlugin } from "@capacitor/core";
import { Filesystem } from "@capacitor/filesystem";
import { createLazyPlugin } from "./lazy-plugin";
import { toNativeCoreError, NativeCoreError } from "../errors/native-core-error";
import { base64ToBytes } from "../domain/binary/binary";
import { isNativePlatform } from "./platform.adapter";
import type { BackgroundDownloadTask, StartDownloadOptions } from "../domain/background-download/types";

const MODULE = "BackgroundDownload";

interface BackgroundDownloadBridge {
  schedule(options: any): Promise<BackgroundDownloadTask>;
  status(options: { releaseId: string }): Promise<BackgroundDownloadTask>;
  remove(options: { releaseId: string }): Promise<void>;
}

const backgroundDownloadPlugin = createLazyPlugin(MODULE, async () => {
  return { plugin: registerPlugin<BackgroundDownloadBridge>("BackgroundDownload") };
});

export const backgroundDownloadAdapter = {
  isAvailable(): boolean {
    return isNativePlatform();
  },
  async schedule(request: StartDownloadOptions): Promise<BackgroundDownloadTask> {
    try {
      const { plugin } = await backgroundDownloadPlugin.required();
      return await plugin.schedule(request);
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async status(releaseId: string): Promise<BackgroundDownloadTask> {
    try {
      const { plugin } = await backgroundDownloadPlugin.required();
      return await plugin.status({ releaseId });
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async remove(releaseId: string): Promise<void> {
    try {
      const { plugin } = await backgroundDownloadPlugin.required();
      await plugin.remove({ releaseId });
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async readInChunks(
    filePath: string,
    consume: (chunk: Uint8Array) => Promise<void> | void,
  ): Promise<void> {
    let chain = Promise.resolve();
    await new Promise<void>((resolve, reject) => {
      void Filesystem.readFileInChunks(
        { path: filePath, chunkSize: 64 * 1024 },
        (result, error) => {
          if (error) {
            reject(toNativeCoreError(MODULE, error));
            return;
          }
          if (!result || !result.data) {
            chain.then(resolve, reject);
            return;
          }
          const chunk = base64ToBytes(String(result.data));
          chain = chain.then(() => consume(chunk));
        },
      ).catch((err) => reject(toNativeCoreError(MODULE, err)));
    });
  },

  async read(
    task: BackgroundDownloadTask,
    consume: (chunk: Uint8Array) => Promise<void> | void,
  ): Promise<void> {
    return this.readInChunks(task.destinationPath, consume);
  },
};
