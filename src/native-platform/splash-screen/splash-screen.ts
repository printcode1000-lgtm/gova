/** Single responsibility: control the native launch overlay after startup. */
import { NativePlatformError } from "../core/errors";
import { isNativePlatform } from "../core/platform";
import {
  hideNativeSplash,
  showNativeSplash,
} from "./splash-screen-native-adapter";
import type { SplashHideOptions, SplashShowOptions } from "./types";
function ensureNative(): void {
  if (!isNativePlatform())
    throw NativePlatformError.unavailable("SplashScreen");
}
export class SplashScreenModule {
  async show(options: SplashShowOptions = {}): Promise<void> {
    ensureNative();
    await showNativeSplash(options);
  }
  async hide(options: SplashHideOptions = {}): Promise<void> {
    ensureNative();
    await hideNativeSplash(options);
  }
}
export const splashScreen = new SplashScreenModule();
