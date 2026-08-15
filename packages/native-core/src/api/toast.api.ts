import { ok, err, type Result } from "../domain/result";
import { NativeCoreError, toNativeCoreError } from "../errors/native-core-error";
import { toastAdapter } from "../adapters/toast.adapter";
import type { ShowToastOptions } from "../domain/toast/types";
import { showToastOptionsSchema } from "../validation/toast.schema";
import { parseInput } from "../validation/helpers";

const MODULE = "Toast";

export const toastApi = {
  async showToast(options: ShowToastOptions): Promise<Result<void, NativeCoreError>> {
    const valid = parseInput(showToastOptionsSchema, options, MODULE);
    if (!valid.ok) return valid;

    try {
      await toastAdapter.show(valid.value);
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },
};
