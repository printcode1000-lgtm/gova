/** Single responsibility: lazily bridge splash-screen controls. */
import { createLazyPlugin } from "../core/lazy-plugin";
import { toNativeError } from "../core/errors";
import type { SplashHideOptions, SplashShowOptions } from "./types";
const plugin = createLazyPlugin(
  "SplashScreen",
  // The namespace is inert; returning the plugin proxy here would make the
  // promise adopt it and call then() on the native bridge.
  async () => await import("@capacitor/splash-screen"),
);
export async function showNativeSplash(
  options: SplashShowOptions,
): Promise<void> {
  try {
    await (await plugin.required()).SplashScreen.show(options);
  } catch (error) {
    throw toNativeError("SplashScreen", error);
  }
}
export async function hideNativeSplash(
  options: SplashHideOptions,
): Promise<void> {
  try {
    await (await plugin.required()).SplashScreen.hide(options);
  } catch (error) {
    throw toNativeError("SplashScreen", error);
  }
}
