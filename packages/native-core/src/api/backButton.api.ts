import { ok, err, type Result } from "../domain/result";
import { NativeCoreError, toNativeCoreError } from "../errors/native-core-error";
import { backButtonAdapter } from "../adapters/back-button.adapter";
import type { BackButtonListener } from "../domain/navigation/types";
import type { Unsubscribe } from "../domain/listener";

const MODULE = "BackButton";

export const backButtonApi = {
  async onBackButton(
    listener: BackButtonListener,
  ): Promise<Result<Unsubscribe, NativeCoreError>> {
    try {
      const unsub = await backButtonAdapter.subscribe(listener);
      return ok(unsub);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },
};
