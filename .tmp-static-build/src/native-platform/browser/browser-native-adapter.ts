/** Single responsibility: lazily bridge external-browser operations to Capacitor. */
import { createLazyPlugin } from "../core/lazy-plugin";
import { toNativeError } from "../core/errors";
import type { BrowserOpenOptions } from "./types";
const plugin = createLazyPlugin(
  "Browser",
  // The namespace is inert; returning the plugin proxy here would make the
  // promise adopt it and call then() on the native bridge.
  async () => await import("@capacitor/browser"),
);
export async function openNativeBrowser(
  options: BrowserOpenOptions,
): Promise<void> {
  try {
    await (await plugin.required()).Browser.open(options);
  } catch (error) {
    throw toNativeError("Browser", error);
  }
}
export async function closeNativeBrowser(): Promise<void> {
  try {
    await (await plugin.required()).Browser.close();
  } catch (error) {
    throw toNativeError("Browser", error);
  }
}
