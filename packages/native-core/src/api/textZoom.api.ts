import { ok, err, type Result } from "../domain/result";
import { NativeCoreError, toNativeCoreError } from "../errors/native-core-error";
import { textZoomAdapter } from "../adapters/text-zoom.adapter";
import type { GetTextZoomResult, SetTextZoomOptions } from "../domain/text-zoom/types";

const MODULE = "TextZoom";

export const textZoomApi = {
  async getTextZoom(): Promise<Result<GetTextZoomResult, NativeCoreError>> {
    try {
      const res = await textZoomAdapter.get();
      return ok(res);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async setTextZoom(options: SetTextZoomOptions): Promise<Result<void, NativeCoreError>> {
    try {
      await textZoomAdapter.set(options);
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },
};
