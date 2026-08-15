import { ActionSheet } from "@capacitor/action-sheet";
import { createLazyPlugin } from "./lazy-plugin";
import { toNativeCoreError } from "../errors/native-core-error";
import type { ShowActionSheetOptions, ShowActionSheetResult } from "../domain/action-sheet/types";

const MODULE = "ActionSheet";

const actionSheetPlugin = createLazyPlugin(MODULE, async () => {
  return ActionSheet;
});

export const actionSheetAdapter = {
  async showActions(options: ShowActionSheetOptions): Promise<ShowActionSheetResult> {
    try {
      const plugin = await actionSheetPlugin.required();
      const result = await plugin.showActions({
        title: options.title,
        message: options.message,
        options: options.options.map((opt) => ({
          title: opt.title,
          style: opt.style as any,
          icon: opt.icon,
        })),
      });
      return { index: result.index };
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },
};
