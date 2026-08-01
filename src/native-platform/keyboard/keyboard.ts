/** Single responsibility: control and observe the native software keyboard. */
import { NativePlatformError } from "../core/errors";
import { isNativePlatform } from "../core/platform";
import {
  hideNativeKeyboard,
  listenNativeKeyboardHide,
  listenNativeKeyboardShow,
  showNativeKeyboard,
} from "./keyboard-native-adapter";
import type { KeyboardListener, KeyboardUnsubscribe } from "./types";
function ensureNative(): void {
  if (!isNativePlatform()) throw NativePlatformError.unavailable("Keyboard");
}
export class KeyboardModule {
  async show(): Promise<void> {
    ensureNative();
    await showNativeKeyboard();
  }
  async hide(): Promise<void> {
    ensureNative();
    await hideNativeKeyboard();
  }
  async onWillShow(listener: KeyboardListener): Promise<KeyboardUnsubscribe> {
    ensureNative();
    return listenNativeKeyboardShow(listener);
  }
  async onWillHide(listener: KeyboardListener): Promise<KeyboardUnsubscribe> {
    ensureNative();
    return listenNativeKeyboardHide(listener);
  }
}
export const keyboard = new KeyboardModule();
