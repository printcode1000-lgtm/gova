import { ok, err, type Result } from "../domain/result";
import { NativeCoreError, toNativeCoreError } from "../errors/native-core-error";
import { statusBarAdapter } from "../adapters/status-bar.adapter";
import type {
  SetStatusBarStyleOptions,
  SetStatusBarBackgroundColorOptions,
  SetStatusBarAnimationOptions,
  StatusBarInfo,
  SetStatusBarOverlaysWebViewOptions,
} from "../domain/status-bar/types";
import {
  setStatusBarStyleOptionsSchema,
  setStatusBarBackgroundColorOptionsSchema,
} from "../validation/statusBar.schema";
import { parseInput } from "../validation/helpers";

const MODULE = "StatusBar";

export const statusBarApi = {
  async setStatusBarStyle(options: SetStatusBarStyleOptions): Promise<Result<void, NativeCoreError>> {
    const valid = parseInput(setStatusBarStyleOptionsSchema, options, MODULE);
    if (!valid.ok) return valid;

    try {
      await statusBarAdapter.setStyle(valid.value);
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async setStatusBarBackgroundColor(
    options: SetStatusBarBackgroundColorOptions,
  ): Promise<Result<void, NativeCoreError>> {
    const valid = parseInput(setStatusBarBackgroundColorOptionsSchema, options, MODULE);
    if (!valid.ok) return valid;

    try {
      await statusBarAdapter.setBackgroundColor(valid.value);
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async showStatusBar(options?: SetStatusBarAnimationOptions): Promise<Result<void, NativeCoreError>> {
    try {
      await statusBarAdapter.show(options);
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async hideStatusBar(options?: SetStatusBarAnimationOptions): Promise<Result<void, NativeCoreError>> {
    try {
      await statusBarAdapter.hide(options);
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async getStatusBarInfo(): Promise<Result<StatusBarInfo, NativeCoreError>> {
    try {
      const info = await statusBarAdapter.getInfo();
      return ok(info);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async setStatusBarOverlaysWebView(
    options: SetStatusBarOverlaysWebViewOptions,
  ): Promise<Result<void, NativeCoreError>> {
    try {
      await statusBarAdapter.setOverlaysWebView(options.overlay);
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },
};
