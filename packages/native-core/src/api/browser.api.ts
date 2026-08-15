import { ok, err, type Result } from "../domain/result";
import { NativeCoreError, toNativeCoreError } from "../errors/native-core-error";
import { browserAdapter } from "../adapters/browser.adapter";
import type { OpenBrowserOptions } from "../domain/browser/types";
import { openBrowserOptionsSchema } from "../validation/browser.schema";
import { parseInput } from "../validation/helpers";

const MODULE = "Browser";

export const browserApi = {
  async openBrowser(options: OpenBrowserOptions): Promise<Result<void, NativeCoreError>> {
    const valid = parseInput(openBrowserOptionsSchema, options, MODULE);
    if (!valid.ok) return valid;

    try {
      await browserAdapter.open(valid.value);
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async closeBrowser(): Promise<Result<void, NativeCoreError>> {
    try {
      await browserAdapter.close();
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },
};
