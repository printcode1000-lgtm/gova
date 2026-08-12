/** Single responsibility: lazily bridge keyboard controls and events. */
import { createLazyPlugin } from "../core/lazy-plugin";
import { toNativeError } from "../core/errors";
import type { KeyboardListener, KeyboardUnsubscribe } from "./types";
const plugin = createLazyPlugin(
  "Keyboard",
  // The namespace is inert; returning the plugin proxy here would make the
  // promise adopt it and call then() on the native bridge.
  async () => await import("@capacitor/keyboard"),
);
export async function showNativeKeyboard(): Promise<void> {
  try {
    await (await plugin.required()).Keyboard.show();
  } catch (error) {
    throw toNativeError("Keyboard", error);
  }
}
export async function hideNativeKeyboard(): Promise<void> {
  try {
    await (await plugin.required()).Keyboard.hide();
  } catch (error) {
    throw toNativeError("Keyboard", error);
  }
}
export async function listenNativeKeyboardShow(
  listener: KeyboardListener,
): Promise<KeyboardUnsubscribe> {
  try {
    const handle = await (
      await plugin.required()
    ).Keyboard.addListener("keyboardWillShow", listener);
    return () => handle.remove();
  } catch (error) {
    throw toNativeError("Keyboard", error);
  }
}
export async function listenNativeKeyboardHide(
  listener: KeyboardListener,
): Promise<KeyboardUnsubscribe> {
  try {
    const handle = await (
      await plugin.required()
    ).Keyboard.addListener("keyboardWillHide", () => listener({ keyboardHeight: 0 }));
    return () => handle.remove();
  } catch (error) {
    throw toNativeError("Keyboard", error);
  }
}
