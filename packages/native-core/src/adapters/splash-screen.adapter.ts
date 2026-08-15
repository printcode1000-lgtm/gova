import { SplashScreen } from "@capacitor/splash-screen";
import { createLazyPlugin } from "./lazy-plugin";
import { toNativeCoreError } from "../errors/native-core-error";
import type { HideSplashOptions, ShowSplashOptions } from "../domain/splash-screen/types";

const MODULE = "SplashScreen";

const splashPlugin = createLazyPlugin(MODULE, async () => {
  return SplashScreen;
});

export const splashScreenAdapter = {
  async show(options?: ShowSplashOptions): Promise<void> {
    try {
      const plugin = await splashPlugin.required();
      await plugin.show({
        autoHide: options?.autoHide,
        fadeInDuration: options?.fadeInDuration,
        fadeOutDuration: options?.fadeOutDuration,
        showDuration: options?.showDuration,
      });
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async hide(options?: HideSplashOptions): Promise<void> {
    try {
      const plugin = await splashPlugin.required();
      await plugin.hide({
        fadeOutDuration: options?.fadeOutDuration,
      });
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },
};
