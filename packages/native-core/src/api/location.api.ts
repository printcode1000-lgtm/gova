import { ok, err, type Result } from "../domain/result";
import { NativeCoreError, toNativeCoreError } from "../errors/native-core-error";
import { locationAdapter } from "../adapters/location.adapter";
import type { LocationFix, LocationOptions, LocationWatchCallback } from "../domain/location/types";
import type { Unsubscribe } from "../domain/listener";
import { locationOptionsSchema } from "../validation/location.schema";
import { parseInput } from "../validation/helpers";

const MODULE = "Location";

export const locationApi = {
  async getCurrentPosition(options?: LocationOptions): Promise<Result<LocationFix, NativeCoreError>> {
    const valid = parseInput(locationOptionsSchema, options ?? {}, MODULE);
    if (!valid.ok) return valid;

    try {
      const fix = await locationAdapter.getCurrentPosition(valid.value);
      return ok(fix);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async watchPosition(
    options: LocationOptions | undefined,
    callback: LocationWatchCallback,
  ): Promise<Result<Unsubscribe, NativeCoreError>> {
    const valid = parseInput(locationOptionsSchema, options ?? {}, MODULE);
    if (!valid.ok) return valid;

    try {
      const unsub = await locationAdapter.watchPosition(valid.value ?? {}, callback);
      return ok(unsub);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async clearWatch(_watchId: string): Promise<Result<void, NativeCoreError>> {
    // clearWatch is not needed since watchPosition returns an Unsubscribe function
    return ok(undefined);
  },
};
