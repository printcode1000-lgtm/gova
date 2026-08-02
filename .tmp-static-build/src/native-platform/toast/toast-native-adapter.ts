/** Single responsibility: lazily bridge transient messages to Capacitor Toast. */
import { createLazyPlugin } from "../core/lazy-plugin";
import { toNativeError } from "../core/errors";
import type { ToastOptions } from "./types";
const plugin = createLazyPlugin(
  "Toast",
  async () => (await import("@capacitor/toast")).Toast,
);
export async function showNativeToast(options: ToastOptions): Promise<void> {
  try {
    await (await plugin.required()).show(options);
  } catch (error) {
    throw toNativeError("Toast", error);
  }
}
