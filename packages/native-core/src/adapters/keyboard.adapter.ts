import { Keyboard, KeyboardResize as CapKeyboardResize } from "@capacitor/keyboard";
import { createLazyPlugin } from "./lazy-plugin";
import { toNativeCoreError } from "../errors/native-core-error";
import type { KeyboardInfo, SetKeyboardResizeOptions } from "../domain/keyboard/types";
import type { Unsubscribe } from "../domain/listener";

const MODULE = "Keyboard";

const keyboardPlugin = createLazyPlugin(MODULE, async () => {
  return Keyboard;
});

export const keyboardAdapter = {
  async show(): Promise<void> {
    try {
      const plugin = await keyboardPlugin.required();
      await plugin.show();
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async hide(): Promise<void> {
    try {
      const plugin = await keyboardPlugin.required();
      await plugin.hide();
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async setResizeMode(options: SetKeyboardResizeOptions): Promise<void> {
    try {
      const plugin = await keyboardPlugin.required();
      let mode: CapKeyboardResize = CapKeyboardResize.Native;
      if (options.mode === "body") mode = CapKeyboardResize.Body;
      else if (options.mode === "ionic") mode = CapKeyboardResize.Ionic;
      else if (options.mode === "none") mode = CapKeyboardResize.None;
      await plugin.setResizeMode({ mode });
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async setAccessoryBarVisible(isAndroidVisible: boolean): Promise<void> {
    try {
      const plugin = await keyboardPlugin.required();
      await plugin.setAccessoryBarVisible({ isVisible: isAndroidVisible });
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async setScroll(isDisabled: boolean): Promise<void> {
    try {
      const plugin = await keyboardPlugin.required();
      await plugin.setScroll({ isDisabled });
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async addListener(
    eventName: "keyboardWillShow" | "keyboardDidShow" | "keyboardWillHide" | "keyboardDidHide",
    listener: (info: KeyboardInfo) => void,
  ): Promise<Unsubscribe> {
    try {
      const plugin = await keyboardPlugin.required();
      const handle = await plugin.addListener(eventName as any, (info: { keyboardHeight: number }) => {
        listener({ keyboardHeight: info.keyboardHeight });
      });
      return () => {
        void handle.remove();
      };
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },
};
