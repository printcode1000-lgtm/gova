/** Single responsibility: present native action choices. */
import { NativePlatformError } from "../core/errors";
import { isNativePlatform } from "../core/platform";
import { showNativeActionSheet } from "./action-sheet-native-adapter";
import type { ActionSheetOptions, ActionSheetResult } from "./types";
export class ActionSheetModule {
  async show(options: ActionSheetOptions): Promise<ActionSheetResult> {
    if (!isNativePlatform())
      throw NativePlatformError.unavailable("ActionSheet");
    return showNativeActionSheet(options);
  }
}
export const actionSheet = new ActionSheetModule();
