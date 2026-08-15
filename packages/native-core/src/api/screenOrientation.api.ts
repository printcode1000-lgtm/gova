import { ok, err, type Result } from "../domain/result";
import { NativeCoreError, toNativeCoreError } from "../errors/native-core-error";
import { screenOrientationAdapter } from "../adapters/screen-orientation.adapter";
import type {
  LockOrientationOptions,
  ScreenOrientationResult,
} from "../domain/screen-orientation/types";

const MODULE = "ScreenOrientation";

export const screenOrientationApi = {
  async getScreenOrientation(): Promise<Result<ScreenOrientationResult, NativeCoreError>> {
    try {
      const res = await screenOrientationAdapter.orientation();
      return ok(res);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async lockScreenOrientation(
    options: LockOrientationOptions,
  ): Promise<Result<void, NativeCoreError>> {
    try {
      await screenOrientationAdapter.lock(options);
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async unlockScreenOrientation(): Promise<Result<void, NativeCoreError>> {
    try {
      await screenOrientationAdapter.unlock();
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },
};
