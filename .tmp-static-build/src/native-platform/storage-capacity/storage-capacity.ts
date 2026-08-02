/** Single responsibility: expose available storage without web approximation. */
import { NativePlatformError } from "../core/errors";
import { isNativePlatform } from "../core/platform";
import { nativeFreeSpace } from "./storage-capacity-native-adapter";
import type { StorageCapacityInfo } from "./types";

export class StorageCapacityModule {
  async getFreeSpace(): Promise<StorageCapacityInfo> {
    if (!isNativePlatform()) throw NativePlatformError.unavailable("StorageCapacity");
    return nativeFreeSpace();
  }
}

export const storageCapacity = new StorageCapacityModule();
