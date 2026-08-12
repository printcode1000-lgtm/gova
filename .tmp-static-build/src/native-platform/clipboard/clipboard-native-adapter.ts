/** Single responsibility: lazily bridge clipboard reads and writes. */
import { createLazyPlugin } from "../core/lazy-plugin";
import { toNativeError } from "../core/errors";
import type { ClipboardValue } from "./types";
const plugin = createLazyPlugin(
  "Clipboard",
  // The namespace is inert; returning the plugin proxy here would make the
  // promise adopt it and call then() on the native bridge.
  async () => await import("@capacitor/clipboard"),
);
export async function readNativeClipboard(): Promise<ClipboardValue> {
  try {
    return await (await plugin.required()).Clipboard.read();
  } catch (error) {
    throw toNativeError("Clipboard", error);
  }
}
export async function writeNativeClipboard(value: string): Promise<void> {
  try {
    await (await plugin.required()).Clipboard.write({ string: value });
  } catch (error) {
    throw toNativeError("Clipboard", error);
  }
}
