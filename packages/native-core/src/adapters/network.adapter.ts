import { Network } from "@capacitor/network";
import { createLazyPlugin, sanitizePlugin } from "./lazy-plugin";
import { toNativeCoreError } from "../errors/native-core-error";
import type { ConnectionType, NetworkStatus } from "../domain/network/types";
import type { Unsubscribe } from "../domain/listener";

const MODULE = "Network";

const networkPlugin = createLazyPlugin(MODULE, async () => {
  return sanitizePlugin(Network);
});

export const networkAdapter = {
  async getStatus(): Promise<NetworkStatus> {
    try {
      const plugin = await networkPlugin.required();
      const status = await plugin.getStatus();
      return {
        connected: status.connected,
        connectionType: status.connectionType as ConnectionType,
      };
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async addListener(listener: (status: NetworkStatus) => void): Promise<Unsubscribe> {
    try {
      const plugin = await networkPlugin.required();
      const handle = await plugin.addListener("networkStatusChange", (status) => {
        listener({
          connected: status.connected,
          connectionType: status.connectionType as ConnectionType,
        });
      });
      return () => {
        void handle.remove();
      };
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },
};
