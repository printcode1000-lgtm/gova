/** Single responsibility: lazily bridge native free-space measurement. */
import { registerPlugin } from "@capacitor/core";

import { createLazyPlugin } from "../core/lazy-plugin";
import { toNativeError } from "../core/errors";
import type { StorageCapacityInfo } from "./types";

interface StorageCapacityPlugin {
  getFreeSpace(): Promise<StorageCapacityInfo>;
}

const plugin = createLazyPlugin("StorageCapacity", async () => {
  // Boxed: returning the proxy itself would make this promise call its
  // then() on the native bridge. A Capacitor proxy answers every property with
  // a function, so promise resolution reads `then`, finds one, and invokes it —
  // surfacing as `"StorageCapacity.then()" is not implemented on android`.
  return { plugin: registerPlugin<StorageCapacityPlugin>("StorageCapacity") };
});

export async function nativeFreeSpace(): Promise<StorageCapacityInfo> {
  try {
    const result = await (await plugin.required()).plugin.getFreeSpace();
    if (!Number.isSafeInteger(result.availableBytes) || result.availableBytes < 0) {
      throw new Error("Native free-space result is invalid");
    }
    return result;
  } catch (error) {
    throw toNativeError("StorageCapacity", error);
  }
}
