import { Clipboard } from "@capacitor/clipboard";
import { createLazyPlugin } from "./lazy-plugin";
import { toNativeCoreError } from "../errors/native-core-error";
import type { ClipboardReadResult, ClipboardWriteOptions } from "../domain/clipboard/types";

const MODULE = "Clipboard";

const clipboardPlugin = createLazyPlugin(MODULE, async () => {
  return Clipboard;
});

export const clipboardAdapter = {
  async read(): Promise<ClipboardReadResult> {
    try {
      const plugin = await clipboardPlugin.required();
      const result = await plugin.read();
      return {
        value: result.value,
        type: result.type,
      };
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async write(options: ClipboardWriteOptions | string): Promise<void> {
    try {
      const plugin = await clipboardPlugin.required();
      const payload: ClipboardWriteOptions =
        typeof options === "string" ? { string: options } : options;
      await plugin.write({
        string: payload.string,
        image: payload.image,
        url: payload.url,
        label: payload.label,
      });
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },
};
