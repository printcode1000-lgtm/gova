/** Single responsibility: lazily bridge transient messages to Capacitor Toast. */
import { createLazyPlugin } from "../core/lazy-plugin";
import { toNativeError } from "../core/errors";
import type { ToastOptions } from "./types";
const plugin = createLazyPlugin(
  "Toast",
  // The namespace is inert; returning the plugin proxy here would make the
  // promise adopt it and call then() on the native bridge.
  async () => await import("@capacitor/toast"),
);
export async function showNativeToast(options: ToastOptions): Promise<void> {
  try {
    await (await plugin.required()).Toast.show(options);
  } catch (error) {
    throw toNativeError("Toast", error);
  }
}
