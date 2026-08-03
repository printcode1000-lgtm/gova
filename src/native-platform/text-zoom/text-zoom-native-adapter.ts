/** Single responsibility: lazily bridge WebView text zoom to Capacitor. */
import { createLazyPlugin } from "../core/lazy-plugin";
import { toNativeError } from "../core/errors";
import type { TextZoomState } from "./types";
const plugin = createLazyPlugin(
  "TextZoom",
  // The namespace is inert; returning the plugin proxy here would make the
  // promise adopt it and call then() on the native bridge.
  async () => await import("@capacitor/text-zoom"),
);
export async function getNativeTextZoom(): Promise<TextZoomState> {
  try {
    return await (await plugin.required()).TextZoom.get();
  } catch (error) {
    throw toNativeError("TextZoom", error);
  }
}
export async function setNativeTextZoom(value: number): Promise<void> {
  try {
    await (await plugin.required()).TextZoom.set({ value });
  } catch (error) {
    throw toNativeError("TextZoom", error);
  }
}
