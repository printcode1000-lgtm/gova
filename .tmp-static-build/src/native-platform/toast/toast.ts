/** Single responsibility: show native transient messages when supported. */
import { NativePlatformError } from "../core/errors";
import { isNativePlatform } from "../core/platform";
import { showNativeToast } from "./toast-native-adapter";
import type { ToastOptions } from "./types";
export class ToastModule {
  async show(options: ToastOptions): Promise<void> {
    if (!isNativePlatform()) throw NativePlatformError.unavailable("Toast");
    await showNativeToast(options);
  }
}
export const toast = new ToastModule();
