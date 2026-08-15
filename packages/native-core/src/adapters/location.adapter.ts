import { Geolocation } from "@capacitor/geolocation";
import { createLazyPlugin } from "./lazy-plugin";
import { toNativeCoreError, NativeCoreError } from "../errors/native-core-error";
import type { LocationFix, LocationOptions, LocationWatchCallback } from "../domain/location/types";
import type { Unsubscribe } from "../domain/listener";

const MODULE = "Location";

const locationPlugin = createLazyPlugin(MODULE, async () => {
  return Geolocation;
});

export const locationAdapter = {
  async getCurrentPosition(options: LocationOptions = {}): Promise<LocationFix> {
    try {
      const plugin = await locationPlugin.required();
      const pos = await plugin.getCurrentPosition({
        enableHighAccuracy: options.enableHighAccuracy ?? true,
        timeout: options.timeout ?? 10_000,
        maximumAge: options.maximumAge ?? 0,
      });

      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        altitude: pos.coords.altitude,
        altitudeAccuracy: pos.coords.altitudeAccuracy,
        heading: pos.coords.heading,
        speed: pos.coords.speed,
        timestamp: pos.timestamp,
      };
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async watchPosition(
    options: LocationOptions,
    callback: LocationWatchCallback,
  ): Promise<Unsubscribe> {
    try {
      const plugin = await locationPlugin.required();
      const callbackId = await plugin.watchPosition(
        {
          enableHighAccuracy: options.enableHighAccuracy ?? true,
          timeout: options.timeout ?? 10_000,
          maximumAge: options.maximumAge ?? 0,
        },
        (pos, err) => {
          if (err) {
            callback(null, err);
            return;
          }
          if (pos) {
            callback({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              altitude: pos.coords.altitude,
              altitudeAccuracy: pos.coords.altitudeAccuracy,
              heading: pos.coords.heading,
              speed: pos.coords.speed,
              timestamp: pos.timestamp,
            });
          }
        },
      );

      return () => {
        void plugin.clearWatch({ id: callbackId });
      };
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },
};
