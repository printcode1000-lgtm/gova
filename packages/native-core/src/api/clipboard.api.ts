import { ok, err, type Result } from "../domain/result";
import { NativeCoreError, toNativeCoreError } from "../errors/native-core-error";
import { clipboardAdapter } from "../adapters/clipboard.adapter";
import type { ClipboardReadResult, ClipboardWriteOptions } from "../domain/clipboard/types";
import { clipboardWriteOptionsSchema } from "../validation/clipboard.schema";
import { parseInput } from "../validation/helpers";

const MODULE = "Clipboard";

export const clipboardApi = {
  async readClipboard(): Promise<Result<ClipboardReadResult, NativeCoreError>> {
    try {
      const result = await clipboardAdapter.read();
      return ok(result);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async writeClipboard(options: ClipboardWriteOptions): Promise<Result<void, NativeCoreError>> {
    const valid = parseInput(clipboardWriteOptionsSchema, options, MODULE);
    if (!valid.ok) return valid;

    try {
      await clipboardAdapter.write(valid.value);
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },
};
