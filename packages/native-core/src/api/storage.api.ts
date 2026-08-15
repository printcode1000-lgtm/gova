import { ok, err, type Result } from "../domain/result";
import { NativeCoreError, toNativeCoreError } from "../errors/native-core-error";
import { storageCapacityAdapter } from "../adapters/storage-capacity.adapter";
import type { StorageCapacityResult } from "../domain/storage-capacity/types";

const MODULE = "StorageCapacity";

export const storageApi = {
  async getStorageFreeSpace(): Promise<Result<StorageCapacityResult, NativeCoreError>> {
    try {
      const res = await storageCapacityAdapter.getFreeSpace();
      return ok(res);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },
};
