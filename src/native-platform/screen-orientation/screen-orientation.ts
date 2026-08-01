/** Single responsibility: inspect and control the current screen orientation. */
import { NativePlatformError } from "../core/errors";
import { isNativePlatform } from "../core/platform";
import {
  currentNativeOrientation,
  lockNativeOrientation,
  unlockNativeOrientation,
} from "./screen-orientation-native-adapter";
import type { ScreenOrientationState, ScreenOrientationType } from "./types";
export class ScreenOrientationModule {
  async current(): Promise<ScreenOrientationState> {
    if (isNativePlatform()) return currentNativeOrientation();
    const type = screen.orientation?.type as ScreenOrientationType | undefined;
    if (!type) throw NativePlatformError.unavailable("ScreenOrientation");
    return { type };
  }
  async lock(type: ScreenOrientationType): Promise<void> {
    if (!isNativePlatform())
      throw NativePlatformError.unavailable("ScreenOrientation");
    await lockNativeOrientation(type);
  }
  async unlock(): Promise<void> {
    if (!isNativePlatform())
      throw NativePlatformError.unavailable("ScreenOrientation");
    await unlockNativeOrientation();
  }
}
export const screenOrientation = new ScreenOrientationModule();
