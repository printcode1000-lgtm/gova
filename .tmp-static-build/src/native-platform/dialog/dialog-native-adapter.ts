/** Single responsibility: lazily bridge alert, confirmation, and prompt dialogs. */
import { createLazyPlugin } from "../core/lazy-plugin";
import { toNativeError } from "../core/errors";
import type {
  DialogConfirmResult,
  DialogOptions,
  DialogPromptResult,
} from "./types";
const plugin = createLazyPlugin(
  "Dialog",
  async () => (await import("@capacitor/dialog")).Dialog,
);
export async function nativeAlert(options: DialogOptions): Promise<void> {
  try {
    await (await plugin.required()).alert(options);
  } catch (error) {
    throw toNativeError("Dialog", error);
  }
}
export async function nativeConfirm(
  options: DialogOptions,
): Promise<DialogConfirmResult> {
  try {
    return await (await plugin.required()).confirm(options);
  } catch (error) {
    throw toNativeError("Dialog", error);
  }
}
export async function nativePrompt(
  options: DialogOptions,
): Promise<DialogPromptResult> {
  try {
    return await (await plugin.required()).prompt(options);
  } catch (error) {
    throw toNativeError("Dialog", error);
  }
}
