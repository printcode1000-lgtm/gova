/** Single responsibility: lazily bridge read-only device information. */
import { createLazyPlugin } from "../core/lazy-plugin";
import { toNativeError } from "../core/errors";
import type { DeviceId, DeviceInfo } from "./types";
const plugin = createLazyPlugin(
  "Device",
  // The namespace is inert; returning the plugin proxy here would make the
  // promise adopt it and call then() on the native bridge.
  async () => await import("@capacitor/device"),
);
export async function nativeDeviceInfo(): Promise<DeviceInfo> {
  try {
    const v = await (await plugin.required()).Device.getInfo();
    return {
      platform: v.platform,
      operatingSystem: v.operatingSystem,
      osVersion: v.osVersion,
      model: v.model,
      manufacturer: v.manufacturer,
      isVirtual: v.isVirtual,
    };
  } catch (error) {
    throw toNativeError("Device", error);
  }
}
export async function nativeDeviceId(): Promise<DeviceId> {
  try {
    return await (await plugin.required()).Device.getId();
  } catch (error) {
    throw toNativeError("Device", error);
  }
}
