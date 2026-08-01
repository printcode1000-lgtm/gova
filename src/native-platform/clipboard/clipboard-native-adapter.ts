/** Single responsibility: lazily bridge clipboard reads and writes. */
import { createLazyPlugin } from "../core/lazy-plugin";
import { toNativeError } from "../core/errors";
import type { ClipboardValue } from "./types";
const plugin = createLazyPlugin(
  "Clipboard",
  async () => (await import("@capacitor/clipboard")).Clipboard,
);
export async function readNativeClipboard(): Promise<ClipboardValue> {
  try {
    return await (await plugin.required()).read();
  } catch (error) {
    throw toNativeError("Clipboard", error);
  }
}
export async function writeNativeClipboard(value: string): Promise<void> {
  try {
    await (await plugin.required()).write({ string: value });
  } catch (error) {
    throw toNativeError("Clipboard", error);
  }
}
