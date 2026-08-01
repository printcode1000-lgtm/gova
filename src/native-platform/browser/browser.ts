/** Single responsibility: open links externally with native and web fallbacks. */
import { NativePlatformError } from "../core/errors";
import { isNativePlatform } from "../core/platform";
import {
  closeNativeBrowser,
  openNativeBrowser,
} from "./browser-native-adapter";
import type { BrowserOpenOptions } from "./types";
export class BrowserModule {
  async open(options: BrowserOpenOptions): Promise<void> {
    if (!/^https?:\/\//i.test(options.url))
      throw NativePlatformError.invalidArgument(
        "Browser",
        "Only HTTP(S) URLs can be opened.",
      );
    if (isNativePlatform()) return openNativeBrowser(options);
    const opened = window.open(options.url, "_blank", "noopener,noreferrer");
    if (!opened)
      throw NativePlatformError.unavailable(
        "Browser",
        "The browser blocked the new window.",
      );
  }
  async close(): Promise<void> {
    if (isNativePlatform()) await closeNativeBrowser();
    else window.close();
  }
}
export const browser = new BrowserModule();
