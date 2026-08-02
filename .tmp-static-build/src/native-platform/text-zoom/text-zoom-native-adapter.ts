/** Single responsibility: lazily bridge WebView text zoom to Capacitor. */
import { createLazyPlugin } from "../core/lazy-plugin";
import { toNativeError } from "../core/errors";
import type { TextZoomState } from "./types";
const plugin = createLazyPlugin(
  "TextZoom",
  async () => (await import("@capacitor/text-zoom")).TextZoom,
);
export async function getNativeTextZoom(): Promise<TextZoomState> {
  try {
    return await (await plugin.required()).get();
  } catch (error) {
    throw toNativeError("TextZoom", error);
  }
}
export async function setNativeTextZoom(value: number): Promise<void> {
  try {
    await (await plugin.required()).set({ value });
  } catch (error) {
    throw toNativeError("TextZoom", error);
  }
}
