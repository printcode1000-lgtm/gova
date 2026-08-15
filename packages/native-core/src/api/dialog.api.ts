import { ok, err, type Result } from "../domain/result";
import { NativeCoreError, toNativeCoreError } from "../errors/native-core-error";
import { dialogAdapter } from "../adapters/dialog.adapter";
import type {
  AlertOptions,
  ConfirmOptions,
  ConfirmResult,
  PromptOptions,
  PromptResult,
} from "../domain/dialog/types";
import {
  alertOptionsSchema,
  confirmOptionsSchema,
  promptOptionsSchema,
} from "../validation/dialog.schema";
import { parseInput } from "../validation/helpers";

const MODULE = "Dialog";

export const dialogApi = {
  async alert(options: AlertOptions): Promise<Result<void, NativeCoreError>> {
    const valid = parseInput(alertOptionsSchema, options, MODULE);
    if (!valid.ok) return valid;

    try {
      await dialogAdapter.alert(valid.value);
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async confirm(options: ConfirmOptions): Promise<Result<ConfirmResult, NativeCoreError>> {
    const valid = parseInput(confirmOptionsSchema, options, MODULE);
    if (!valid.ok) return valid;

    try {
      const result = await dialogAdapter.confirm(valid.value);
      return ok(result);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async prompt(options: PromptOptions): Promise<Result<PromptResult, NativeCoreError>> {
    const valid = parseInput(promptOptionsSchema, options, MODULE);
    if (!valid.ok) return valid;

    try {
      const result = await dialogAdapter.prompt(valid.value);
      return ok(result);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },
};
