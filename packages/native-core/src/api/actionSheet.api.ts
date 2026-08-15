import { ok, err, type Result } from "../domain/result";
import { NativeCoreError, toNativeCoreError } from "../errors/native-core-error";
import { actionSheetAdapter } from "../adapters/action-sheet.adapter";
import type {
  ShowActionSheetOptions,
  ShowActionSheetResult,
} from "../domain/action-sheet/types";

const MODULE = "ActionSheet";

export const actionSheetApi = {
  async showActionSheet(
    options: ShowActionSheetOptions,
  ): Promise<Result<ShowActionSheetResult, NativeCoreError>> {
    try {
      const res = await actionSheetAdapter.showActions(options);
      return ok(res);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },
};
