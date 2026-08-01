/** Single responsibility: lazily bridge splash-screen controls. */
import { createLazyPlugin } from "../core/lazy-plugin";
import { toNativeError } from "../core/errors";
import type { SplashHideOptions, SplashShowOptions } from "./types";
const plugin = createLazyPlugin(
  "SplashScreen",
  async () => (await import("@capacitor/splash-screen")).SplashScreen,
);
export async function showNativeSplash(
  options: SplashShowOptions,
): Promise<void> {
  try {
    await (await plugin.required()).show(options);
  } catch (error) {
    throw toNativeError("SplashScreen", error);
  }
}
export async function hideNativeSplash(
  options: SplashHideOptions,
): Promise<void> {
  try {
    await (await plugin.required()).hide(options);
  } catch (error) {
    throw toNativeError("SplashScreen", error);
  }
}
