import { ok, err, type Result } from "../domain/result";
import { NativeCoreError, toNativeCoreError } from "../errors/native-core-error";
import { deviceAdapter } from "../adapters/device.adapter";
import type { DeviceInfo, DeviceBatteryInfo, DeviceId } from "../domain/device/types";

const MODULE = "Device";

export const deviceApi = {
  async getDeviceInfo(): Promise<Result<DeviceInfo, NativeCoreError>> {
    try {
      const info = await deviceAdapter.getInfo();
      return ok(info);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async getDeviceId(): Promise<Result<DeviceId, NativeCoreError>> {
    try {
      const id = await deviceAdapter.getId();
      return ok(id);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async getDeviceBatteryInfo(): Promise<Result<DeviceBatteryInfo, NativeCoreError>> {
    try {
      const battery = await deviceAdapter.getBatteryInfo();
      return ok(battery);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },
};
