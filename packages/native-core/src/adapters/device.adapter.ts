import { Device } from "@capacitor/device";
import { createLazyPlugin } from "./lazy-plugin";
import { toNativeCoreError } from "../errors/native-core-error";
import type { DeviceInfo, DeviceBatteryInfo, DeviceId } from "../domain/device/types";

const MODULE = "Device";

const devicePlugin = createLazyPlugin(MODULE, async () => {
  return Device;
});

export const deviceAdapter = {
  async getInfo(): Promise<DeviceInfo> {
    try {
      const plugin = await devicePlugin.required();
      const info = await plugin.getInfo();
      return {
        model: info.model,
        platform: info.platform as "android" | "ios" | "web",
        operatingSystem: info.operatingSystem,
        osVersion: info.osVersion,
        manufacturer: info.manufacturer,
        isVirtual: info.isVirtual,
        memUsed: info.memUsed,
        realDiskFree: (info as any).realDiskFree,
        realDiskTotal: (info as any).realDiskTotal,
        webViewVersion: info.webViewVersion,
      };
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async getBatteryInfo(): Promise<DeviceBatteryInfo> {
    try {
      const plugin = await devicePlugin.required();
      const battery = await plugin.getBatteryInfo();
      return {
        batteryLevel: battery.batteryLevel,
        isCharging: battery.isCharging,
      };
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async getId(): Promise<DeviceId> {
    try {
      const plugin = await devicePlugin.required();
      const id = await plugin.getId();
      return {
        identifier: id.identifier,
      };
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },
};
