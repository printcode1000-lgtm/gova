/** Single responsibility: control native status-bar presentation. */
import { NativePlatformError } from "../core/errors";
import { isNativePlatform } from "../core/platform";
import {
  addNativeStatusBarChangeListener,
  setNativeStatusBarColor,
  getNativeStatusBarInfo,
  setNativeStatusBarStyle,
  setNativeStatusBarVisible,
} from "./status-bar-native-adapter";
import type { StatusBarInfo, StatusBarStyleName } from "./types";
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
  async getInfo(): Promise<StatusBarInfo> {
    ensureNative();
    return getNativeStatusBarInfo();
  }
  /** Observe visibility/overlay changes. Resolves to an unsubscribe function. */
  async onChange(
    listener: (info: StatusBarInfo) => void,
  ): Promise<() => void> {
    ensureNative();
    return addNativeStatusBarChangeListener(listener);
  }
}
export const statusBar = new StatusBarModule();
