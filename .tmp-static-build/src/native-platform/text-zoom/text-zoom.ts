/** Single responsibility: inspect and set native WebView text scaling. */
import { NativePlatformError } from "../core/errors";
import { isNativePlatform } from "../core/platform";
import {
  getNativeTextZoom,
  setNativeTextZoom,
} from "./text-zoom-native-adapter";
import type { TextZoomState } from "./types";
function ensureNative(): void {
  if (!isNativePlatform()) throw NativePlatformError.unavailable("TextZoom");
}
export class TextZoomModule {
  async get(): Promise<TextZoomState> {
    ensureNative();
    return getNativeTextZoom();
  }
  async set(value: number): Promise<void> {
    ensureNative();
    if (!Number.isFinite(value) || value <= 0)
      throw NativePlatformError.invalidArgument(
        "TextZoom",
        "Text zoom must be a positive percentage.",
      );
    await setNativeTextZoom(value);
  }
}
export const textZoom = new TextZoomModule();
