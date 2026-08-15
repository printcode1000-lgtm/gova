import { registerPlugin } from "@capacitor/core";
import { createLazyPlugin } from "./lazy-plugin";
import { toNativeCoreError } from "../errors/native-core-error";
import type { StorageCapacity } from "../domain/storage-capacity/types";

const MODULE = "StorageCapacity";

interface StorageCapacityPluginApi {
  getFreeSpace(): Promise<{ availableBytes: number }>;
}

const storageCapacityPlugin = createLazyPlugin(MODULE, async () => {
  return { plugin: registerPlugin<StorageCapacityPluginApi>("StorageCapacity") };
});

export const storageCapacityAdapter = {
  async getFreeSpace(): Promise<StorageCapacity> {
    try {
      const { plugin } = await storageCapacityPlugin.required();
      const res = await plugin.getFreeSpace();
      return { availableBytes: res.availableBytes };
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },
};
