import { ok, err, type Result } from "../domain/result";
import { NativeCoreError, toNativeCoreError } from "../errors/native-core-error";
import { hapticsAdapter } from "../adapters/haptics.adapter";
import type { ImpactOptions, NotificationOptions, VibrateOptions } from "../domain/haptics/types";

const MODULE = "Haptics";

export const hapticsApi = {
  async hapticsImpact(options?: ImpactOptions): Promise<Result<void, NativeCoreError>> {
    try {
      await hapticsAdapter.impact(options ?? { style: "medium" });
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async hapticsNotification(options?: NotificationOptions): Promise<Result<void, NativeCoreError>> {
    try {
      await hapticsAdapter.notification(options ?? { type: "success" });
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async hapticsVibrate(options?: VibrateOptions): Promise<Result<void, NativeCoreError>> {
    try {
      await hapticsAdapter.vibrate(options);
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async hapticsSelectionStart(): Promise<Result<void, NativeCoreError>> {
    try {
      await hapticsAdapter.selectionStart();
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async hapticsSelectionChanged(): Promise<Result<void, NativeCoreError>> {
    try {
      await hapticsAdapter.selectionChanged();
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async hapticsSelectionEnd(): Promise<Result<void, NativeCoreError>> {
    try {
      await hapticsAdapter.selectionEnd();
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },
};
