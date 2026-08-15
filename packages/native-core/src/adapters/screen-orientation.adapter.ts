import { ScreenOrientation, OrientationLockType as CapOrientationLockType } from "@capacitor/screen-orientation";
import { createLazyPlugin, sanitizePlugin } from "./lazy-plugin";
import { toNativeCoreError } from "../errors/native-core-error";
import type { LockOrientationOptions, OrientationLockType, OrientationType, ScreenOrientationResult } from "../domain/screen-orientation/types";
import type { Unsubscribe } from "../domain/listener";

const MODULE = "ScreenOrientation";

const orientationPlugin = createLazyPlugin(MODULE, async () => {
  return sanitizePlugin(ScreenOrientation);
});

export const screenOrientationAdapter = {
  async orientation(): Promise<ScreenOrientationResult> {
    try {
      const plugin = await orientationPlugin.required();
      const res = await plugin.orientation();
      return { type: res.type as OrientationType };
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async lock(options: LockOrientationOptions): Promise<void> {
    try {
      const plugin = await orientationPlugin.required();
      await plugin.lock({ orientation: options.orientation as CapOrientationLockType });
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async unlock(): Promise<void> {
    try {
      const plugin = await orientationPlugin.required();
      await plugin.unlock();
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async addListener(listener: (res: ScreenOrientationResult) => void): Promise<Unsubscribe> {
    try {
      const plugin = await orientationPlugin.required();
      const handle = await plugin.addListener("screenOrientationChange", (res) => {
        listener({ type: res.type as OrientationType });
      });
      return () => {
        void handle.remove();
      };
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },
};
