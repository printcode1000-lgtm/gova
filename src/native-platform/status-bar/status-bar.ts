/** Single responsibility: control native status-bar presentation. */
import { NativePlatformError } from "../core/errors";
import { isNativePlatform } from "../core/platform";
import {
  setNativeStatusBarColor,
  setNativeStatusBarStyle,
  setNativeStatusBarVisible,
} from "./status-bar-native-adapter";
import type { StatusBarStyleName } from "./types";
function ensureNative(): void {
  if (!isNativePlatform()) throw NativePlatformError.unavailable("StatusBar");
}
export class StatusBarModule {
  async setStyle(style: StatusBarStyleName): Promise<void> {
    ensureNative();
    await setNativeStatusBarStyle(style);
  }
  async setVisible(visible: boolean): Promise<void> {
    ensureNative();
    await setNativeStatusBarVisible(visible);
  }
  async setBackgroundColor(color: string): Promise<void> {
    ensureNative();
    await setNativeStatusBarColor(color);
  }
}
export const statusBar = new StatusBarModule();
