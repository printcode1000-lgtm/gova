import { TextZoom } from "@capacitor/text-zoom";
import { createLazyPlugin, sanitizePlugin } from "./lazy-plugin";
import { toNativeCoreError } from "../errors/native-core-error";
import type { SetTextZoomOptions, TextZoomResult } from "../domain/text-zoom/types";

const MODULE = "TextZoom";

const textZoomPlugin = createLazyPlugin(MODULE, async () => {
  return sanitizePlugin(TextZoom);
});

export const textZoomAdapter = {
  async get(): Promise<TextZoomResult> {
    try {
      const plugin = await textZoomPlugin.required();
      const res = await plugin.get();
      return { value: res.value };
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async set(options: SetTextZoomOptions): Promise<void> {
    try {
      const plugin = await textZoomPlugin.required();
      await plugin.set({ value: options.value });
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },
};
