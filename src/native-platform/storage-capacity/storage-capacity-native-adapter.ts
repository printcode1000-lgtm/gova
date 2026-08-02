/** Single responsibility: lazily bridge native free-space measurement. */
import { registerPlugin } from "@capacitor/core";

import { createLazyPlugin } from "../core/lazy-plugin";
import { toNativeError } from "../core/errors";
import type { StorageCapacityInfo } from "./types";

interface StorageCapacityPlugin {
  getFreeSpace(): Promise<StorageCapacityInfo>;
}

const plugin = createLazyPlugin(
  "StorageCapacity",
  async () => registerPlugin<StorageCapacityPlugin>("StorageCapacity"),
);

export async function nativeFreeSpace(): Promise<StorageCapacityInfo> {
  try {
    const result = await (await plugin.required()).getFreeSpace();
    if (!Number.isSafeInteger(result.availableBytes) || result.availableBytes < 0) {
      throw new Error("Native free-space result is invalid");
    }
    return result;
  } catch (error) {
    throw toNativeError("StorageCapacity", error);
  }
}
