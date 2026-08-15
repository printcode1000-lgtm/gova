import { ok, err, type Result } from "../domain/result";
import { NativeCoreError, toNativeCoreError } from "../errors/native-core-error";
import { backgroundDownloadAdapter } from "../adapters/background-download.adapter";
import type {
  BackgroundDownloadTask,
  StartDownloadOptions,
} from "../domain/background-download/types";
import { startDownloadOptionsSchema } from "../validation/download.schema";
import { parseInput } from "../validation/helpers";

const MODULE = "BackgroundDownload";

export const downloadApi = {
  async startDownload(
    options: StartDownloadOptions,
  ): Promise<Result<BackgroundDownloadTask, NativeCoreError>> {
    const valid = parseInput(startDownloadOptionsSchema, options, MODULE);
    if (!valid.ok) return valid;

    try {
      const task = await backgroundDownloadAdapter.schedule(valid.value);
      return ok(task);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async getDownloadStatus(
    id: string,
  ): Promise<Result<BackgroundDownloadTask | null, NativeCoreError>> {
    try {
      const status = await backgroundDownloadAdapter.status(id).catch(() => null);
      return ok(status);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async cancelDownload(id: string): Promise<Result<void, NativeCoreError>> {
    try {
      await backgroundDownloadAdapter.remove(id);
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },
};
