/**
 * Map GPS provider backed by the Native Platform Location module.
 *
 * Single responsibility: adapt `NativeCore.getCurrentPosition` / `NativeCore.watchPosition` to the map's
 * `GpsProvider` shape. It is the default provider for every ASOL map, so the
 * map never talks to `navigator.geolocation` and inherits permission handling,
 * GPS-disabled detection, and the unified error taxonomy for free.
 */

import { NativeCore, isNativePlatform } from "@asol/native-core";
import type { LocationFix, LocationOptions } from "@asol/native-core";
import type { AsolMapLocation, GpsProvider } from "./types";

function toMapLocation(fix: LocationFix): AsolMapLocation {
  return {
    latitude: fix.latitude,
    longitude: fix.longitude,
    accuracy: fix.accuracy ?? 0,
    heading: fix.heading ?? null,
    speed: fix.speed ?? null,
    timestamp: fix.timestamp,
    source: "capacitor",
  };
}

/** Translate the browser `PositionOptions` the map passes into module options. */
function toLocationOptions(options?: PositionOptions): LocationOptions {
  return {
    enableHighAccuracy: options?.enableHighAccuracy ?? true,
    ...(options?.timeout !== undefined ? { timeout: options.timeout } : {}),
    ...(options?.maximumAge !== undefined ? { maximumAge: options.maximumAge } : {}),
  };
}

export function createNativePlatformGpsProvider(): GpsProvider {
  return {
    id: "native-platform",

    isAvailable: () => isNativePlatform() || (typeof navigator !== "undefined" && "geolocation" in navigator),

    async getCurrentPosition(options) {
      const res = await NativeCore.getCurrentPosition(toLocationOptions(options));
      if (!res.ok) {
        throw res.error;
      }
      return toMapLocation(res.value);
    },

    async watchPosition(onLocation, onError, options) {
      const res = await NativeCore.watchPosition(
        toLocationOptions(options),
        (fix: LocationFix | null, err?: Error) => {
          if (err) {
            onError?.(err);
            return;
          }
          if (fix) {
            onLocation(toMapLocation(fix));
          }
        },
      );
      if (!res.ok) {
        onError?.(res.error);
        return () => {};
      }
      return () => {
        void res.value();
      };
    },
  };
}
