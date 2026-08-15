import { ok, err, type Result } from "../domain/result";
import { NativeCoreError, toNativeCoreError } from "../errors/native-core-error";
import { keyboardAdapter } from "../adapters/keyboard.adapter";
import type { KeyboardInfo, SetKeyboardResizeOptions } from "../domain/keyboard/types";
import type { Unsubscribe } from "../domain/listener";

const MODULE = "Keyboard";

export const keyboardApi = {
  async showKeyboard(): Promise<Result<void, NativeCoreError>> {
    try {
      await keyboardAdapter.show();
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async hideKeyboard(): Promise<Result<void, NativeCoreError>> {
    try {
      await keyboardAdapter.hide();
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async setKeyboardResize(options: SetKeyboardResizeOptions): Promise<Result<void, NativeCoreError>> {
    try {
      await keyboardAdapter.setResizeMode(options);
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async getKeyboardResize(): Promise<Result<SetKeyboardResizeOptions, NativeCoreError>> {
    // keyboard adapter does not expose getResize; return a default
    return ok({ mode: "native" });
  },

  async setKeyboardAccessoryBarVisible(options: { isVisible: boolean }): Promise<Result<void, NativeCoreError>> {
    try {
      await keyboardAdapter.setAccessoryBarVisible(options.isVisible);
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async onKeyboardWillShow(
    listener: (info: KeyboardInfo) => void,
  ): Promise<Result<Unsubscribe, NativeCoreError>> {
    try {
      const unsub = await keyboardAdapter.addListener("keyboardWillShow", listener);
      return ok(unsub);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async onKeyboardDidShow(
    listener: (info: KeyboardInfo) => void,
  ): Promise<Result<Unsubscribe, NativeCoreError>> {
    try {
      const unsub = await keyboardAdapter.addListener("keyboardDidShow", listener);
      return ok(unsub);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async onKeyboardWillHide(
    listener: () => void,
  ): Promise<Result<Unsubscribe, NativeCoreError>> {
    try {
      const unsub = await keyboardAdapter.addListener("keyboardWillHide", listener);
      return ok(unsub);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async onKeyboardDidHide(
    listener: () => void,
  ): Promise<Result<Unsubscribe, NativeCoreError>> {
    try {
      const unsub = await keyboardAdapter.addListener("keyboardDidHide", listener);
      return ok(unsub);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },
};
