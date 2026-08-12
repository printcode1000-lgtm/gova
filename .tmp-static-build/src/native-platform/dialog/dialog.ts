/** Single responsibility: expose dialogs with a consistent native/web contract. */
import { isNativePlatform } from "../core/platform";
import {
  nativeAlert,
  nativeConfirm,
  nativePrompt,
} from "./dialog-native-adapter";
import type {
  DialogConfirmResult,
  DialogOptions,
  DialogPromptResult,
} from "./types";
export class DialogModule {
  async alert(options: DialogOptions): Promise<void> {
    if (isNativePlatform()) await nativeAlert(options);
    else window.alert(options.message);
  }
  async confirm(options: DialogOptions): Promise<DialogConfirmResult> {
    return isNativePlatform()
      ? nativeConfirm(options)
      : { value: window.confirm(options.message) };
  }
  async prompt(options: DialogOptions): Promise<DialogPromptResult> {
    if (isNativePlatform()) return nativePrompt(options);
    const value = window.prompt(options.message);
    return { value: value ?? "", cancelled: value === null };
  }
}
export const dialog = new DialogModule();
