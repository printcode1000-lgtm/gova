/** Single responsibility: expose normalized device identity and metadata. */
import { isNativePlatform } from "../core/platform";
import { preferences } from "../preferences/preferences";
import { nativeDeviceId, nativeDeviceInfo } from "./device-native-adapter";
import type { DeviceId, DeviceInfo } from "./types";
export class DeviceModule {
  async getInfo(): Promise<DeviceInfo> {
    return isNativePlatform()
      ? nativeDeviceInfo()
      : {
          platform: "web",
          operatingSystem: "unknown",
          osVersion: "",
          model: navigator.userAgent,
          manufacturer: "",
          isVirtual: false,
        };
  }
  async getId(): Promise<DeviceId> {
    if (isNativePlatform()) return nativeDeviceId();
    let id = (await preferences.get("asol-device-id")).value;
    if (!id) {
      id = crypto.randomUUID();
      await preferences.set("asol-device-id", id);
    }
    return { identifier: id };
  }
}
export const device = new DeviceModule();
