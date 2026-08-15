import { ok, err, type Result } from "../domain/result";
import { NativeCoreError, toNativeCoreError } from "../errors/native-core-error";
import { shareAdapter } from "../adapters/share.adapter";
import type { ShareOptions, ShareResult } from "../domain/share/types";
import type { ValidatedReceivedItem } from "../domain/share/share-validator";
import type { ShareListener } from "../domain/share/share-queue";
import type { Unsubscribe } from "../domain/listener";
import { shareOptionsSchema } from "../validation/share.schema";
import { parseInput } from "../validation/helpers";

const MODULE = "Share";

export const shareApi = {
  async canShare(): Promise<Result<boolean, NativeCoreError>> {
    try {
      const can = await shareAdapter.canShare();
      return ok(can);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async share(options: ShareOptions): Promise<Result<ShareResult, NativeCoreError>> {
    const valid = parseInput(shareOptionsSchema, options, MODULE);
    if (!valid.ok) return valid;

    try {
      const res = await shareAdapter.share(valid.value);
      return ok(res);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async getPendingShareItems(): Promise<Result<ValidatedReceivedItem[], NativeCoreError>> {
    try {
      const items = await shareAdapter.getPendingShareItems();
      return ok(items);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async onShareReceived(listener: ShareListener): Promise<Result<Unsubscribe, NativeCoreError>> {
    try {
      const unsub = await shareAdapter.onShareReceived(listener);
      return ok(unsub);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },
};
