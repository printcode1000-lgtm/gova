import { Toast } from "@capacitor/toast";
import { createLazyPlugin, sanitizePlugin } from "./lazy-plugin";
import { toNativeCoreError } from "../errors/native-core-error";
import type { ShowToastOptions } from "../domain/toast/types";

const MODULE = "Toast";

const toastPlugin = createLazyPlugin(MODULE, async () => {
  return sanitizePlugin(Toast);
});

export const toastAdapter = {
  async show(options: ShowToastOptions): Promise<void> {
    try {
      const plugin = await toastPlugin.required();
      await plugin.show({
        text: options.text,
        duration: options.duration ?? "short",
        position: options.position ?? "bottom",
      });
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },
};
