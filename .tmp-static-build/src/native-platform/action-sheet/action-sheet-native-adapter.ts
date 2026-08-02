/** Single responsibility: lazily bridge action-sheet selection to Capacitor. */
import { createLazyPlugin } from "../core/lazy-plugin";
import { toNativeError } from "../core/errors";
import type { ActionSheetOptions, ActionSheetResult } from "./types";
const plugin = createLazyPlugin(
  "ActionSheet",
  async () => await import("@capacitor/action-sheet"),
);
export async function showNativeActionSheet(
  options: ActionSheetOptions,
): Promise<ActionSheetResult> {
  try {
    const p = await plugin.required();
    const style = {
      default: p.ActionSheetButtonStyle.Default,
      destructive: p.ActionSheetButtonStyle.Destructive,
      cancel: p.ActionSheetButtonStyle.Cancel,
    };
    return await p.ActionSheet.showActions({
      ...options,
      options: options.options.map((item) => ({
        ...item,
        style: style[item.style ?? "default"],
      })),
    });
  } catch (error) {
    throw toNativeError("ActionSheet", error);
  }
}
