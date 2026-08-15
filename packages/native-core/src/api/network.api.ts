import { ok, err, type Result } from "../domain/result";
import { NativeCoreError, toNativeCoreError } from "../errors/native-core-error";
import { networkAdapter } from "../adapters/network.adapter";
import type { NetworkStatus } from "../domain/network/types";
import type { Unsubscribe } from "../domain/listener";

const MODULE = "Network";

export const networkApi = {
  async getNetworkStatus(): Promise<Result<NetworkStatus, NativeCoreError>> {
    try {
      const status = await networkAdapter.getStatus();
      return ok(status);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async onNetworkStatusChange(
    listener: (status: NetworkStatus) => void,
  ): Promise<Result<Unsubscribe, NativeCoreError>> {
    try {
      const unsub = await networkAdapter.addListener(listener);
      return ok(unsub);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },
};
