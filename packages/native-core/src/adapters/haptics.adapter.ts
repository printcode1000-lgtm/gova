import { Haptics, ImpactStyle as CapImpactStyle, NotificationType as CapNotificationType } from "@capacitor/haptics";
import { createLazyPlugin, sanitizePlugin } from "./lazy-plugin";
import { toNativeCoreError } from "../errors/native-core-error";
import type { ImpactOptions, NotificationOptions, VibrateOptions } from "../domain/haptics/types";

const MODULE = "Haptics";

const hapticsPlugin = createLazyPlugin(MODULE, async () => {
  return sanitizePlugin(Haptics);
});

export const hapticsAdapter = {
  async impact(options: ImpactOptions): Promise<void> {
    try {
      const plugin = await hapticsPlugin.required();
      let style: CapImpactStyle = CapImpactStyle.Medium;
      if (options.style === "heavy") style = CapImpactStyle.Heavy;
      else if (options.style === "light") style = CapImpactStyle.Light;
      await plugin.impact({ style });
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async notification(options: NotificationOptions): Promise<void> {
    try {
      const plugin = await hapticsPlugin.required();
      let type: CapNotificationType = CapNotificationType.Success;
      if (options.type === "warning") type = CapNotificationType.Warning;
      else if (options.type === "error") type = CapNotificationType.Error;
      await plugin.notification({ type });
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async vibrate(options?: VibrateOptions): Promise<void> {
    try {
      const plugin = await hapticsPlugin.required();
      await plugin.vibrate({ duration: options?.duration ?? 300 });
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async selectionStart(): Promise<void> {
    try {
      const plugin = await hapticsPlugin.required();
      await plugin.selectionStart();
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async selectionChanged(): Promise<void> {
    try {
      const plugin = await hapticsPlugin.required();
      await plugin.selectionChanged();
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async selectionEnd(): Promise<void> {
    try {
      const plugin = await hapticsPlugin.required();
      await plugin.selectionEnd();
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },
};
