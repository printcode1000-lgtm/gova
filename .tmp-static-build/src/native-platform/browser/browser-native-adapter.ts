/** Single responsibility: lazily bridge external-browser operations to Capacitor. */
import { createLazyPlugin } from "../core/lazy-plugin";
import { toNativeError } from "../core/errors";
import type { BrowserOpenOptions } from "./types";
const plugin = createLazyPlugin(
  "Browser",
  async () => (await import("@capacitor/browser")).Browser,
);
export async function openNativeBrowser(
  options: BrowserOpenOptions,
): Promise<void> {
  try {
    await (await plugin.required()).open(options);
  } catch (error) {
    throw toNativeError("Browser", error);
  }
}
export async function closeNativeBrowser(): Promise<void> {
  try {
    await (await plugin.required()).close();
  } catch (error) {
    throw toNativeError("Browser", error);
  }
}
