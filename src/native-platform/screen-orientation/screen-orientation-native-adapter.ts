/** Single responsibility: lazily bridge screen-orientation controls. */
import { createLazyPlugin } from "../core/lazy-plugin";
import { toNativeError } from "../core/errors";
import type { ScreenOrientationState, ScreenOrientationType } from "./types";
const plugin = createLazyPlugin(
  "ScreenOrientation",
  async () => (await import("@capacitor/screen-orientation")).ScreenOrientation,
);
export async function currentNativeOrientation(): Promise<ScreenOrientationState> {
  try {
    return await (await plugin.required()).orientation();
  } catch (error) {
    throw toNativeError("ScreenOrientation", error);
  }
}
export async function lockNativeOrientation(
  type: ScreenOrientationType,
): Promise<void> {
  try {
    await (await plugin.required()).lock({ orientation: type });
  } catch (error) {
    throw toNativeError("ScreenOrientation", error);
  }
}
export async function unlockNativeOrientation(): Promise<void> {
  try {
    await (await plugin.required()).unlock();
  } catch (error) {
    throw toNativeError("ScreenOrientation", error);
  }
}
