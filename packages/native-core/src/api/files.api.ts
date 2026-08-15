import { ok, err, type Result } from "../domain/result";
import { NativeCoreError, toNativeCoreError } from "../errors/native-core-error";
import { filesAdapter } from "../adapters/files.adapter";
import type {
  DeleteFileOptions,
  OpenFileExternallyOptions,
  PickedFile,
  PickFilesOptions,
  ReadFileOptions,
  ReadFileResult,
  SaveFileOptions,
  SaveFileResult,
} from "../domain/files/types";
import {
  pickFileOptionsSchema,
  saveFileOptionsSchema,
  readFileOptionsSchema,
  deleteFileOptionsSchema,
  openFileExternallyOptionsSchema,
} from "../validation/files.schema";
import { parseInput } from "../validation/helpers";

const MODULE = "Files";

export const filesApi = {
  async pickFiles(options?: PickFilesOptions): Promise<Result<PickedFile[], NativeCoreError>> {
    const valid = parseInput(pickFileOptionsSchema, options, MODULE);
    if (!valid.ok) return valid;

    try {
      const files = await filesAdapter.pickFiles(valid.value);
      return ok(files);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async saveFile(options: SaveFileOptions): Promise<Result<SaveFileResult, NativeCoreError>> {
    const valid = parseInput(saveFileOptionsSchema, options, MODULE);
    if (!valid.ok) return valid;

    try {
      const result = await filesAdapter.saveFile(valid.value);
      return ok(result);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async readFile(options: ReadFileOptions): Promise<Result<ReadFileResult, NativeCoreError>> {
    const valid = parseInput(readFileOptionsSchema, options, MODULE);
    if (!valid.ok) return valid;

    try {
      const result = await filesAdapter.readFile(valid.value);
      return ok(result);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async writeFile(options: {
    path: string;
    data: string;
    directory?: string;
    recursive?: boolean;
  }): Promise<Result<void, NativeCoreError>> {
    try {
      await filesAdapter.saveFile({
        fileName: options.path,
        data: options.data,
        directory: options.directory,
      });
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async deleteFile(options: DeleteFileOptions): Promise<Result<void, NativeCoreError>> {
    const valid = parseInput(deleteFileOptionsSchema, options, MODULE);
    if (!valid.ok) return valid;

    try {
      await filesAdapter.deleteFile(valid.value);
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  /**
   * Open a file the application already saved in an external viewer.
   *
   * Backs the `files.open` capability, which installed shells have been
   * promised since 0.2.0, so the OTA capability scanner requires a call site
   * for it to stay detectable.
   */
  async openFileExternally(
    options: OpenFileExternallyOptions,
  ): Promise<Result<void, NativeCoreError>> {
    const valid = parseInput(openFileExternallyOptionsSchema, options, MODULE);
    if (!valid.ok) return valid;

    try {
      await filesAdapter.openExternally(valid.value);
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },
};
