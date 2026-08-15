import { ok, err, type Result } from "../domain/result";
import { NativeCoreError, toNativeCoreError } from "../errors/native-core-error";
import { splashScreenAdapter } from "../adapters/splash-screen.adapter";
import type { HideSplashOptions, ShowSplashOptions } from "../domain/splash-screen/types";

const MODULE = "SplashScreen";

export const splashApi = {
  async showSplashScreen(options?: ShowSplashOptions): Promise<Result<void, NativeCoreError>> {
    try {
      await splashScreenAdapter.show(options);
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async hideSplashScreen(options?: HideSplashOptions): Promise<Result<void, NativeCoreError>> {
    try {
      await splashScreenAdapter.hide(options);
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },
};
