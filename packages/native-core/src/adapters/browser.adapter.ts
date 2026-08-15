import { Browser } from "@capacitor/browser";
import { createLazyPlugin } from "./lazy-plugin";
import { toNativeCoreError } from "../errors/native-core-error";
import type { OpenBrowserOptions } from "../domain/browser/types";

const MODULE = "Browser";

const browserPlugin = createLazyPlugin(MODULE, async () => {
  return Browser;
});

export const browserAdapter = {
  async open(options: OpenBrowserOptions): Promise<void> {
    try {
      const plugin = await browserPlugin.required();
      await plugin.open({
        url: options.url,
        windowName: options.windowName,
        toolbarColor: options.toolbarColor,
        presentationStyle: options.presentationStyle,
      });
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async close(): Promise<void> {
    try {
      const plugin = await browserPlugin.required();
      await plugin.close();
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },
};
