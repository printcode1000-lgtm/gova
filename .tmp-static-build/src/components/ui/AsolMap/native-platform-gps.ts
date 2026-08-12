/**
 * Map GPS provider backed by the Native Platform Location module.
 *
 * Single responsibility: adapt `nativePlatform.location` to the map's
 * `GpsProvider` shape. It is the default provider for every ASOL map, so the
 * map never talks to `navigator.geolocation` and inherits permission handling,
 * GPS-disabled detection, and the unified error taxonomy for free.
 */

import { location } from "@/native-platform/location";
import type { LocationFix, LocationOptions } from "@/native-platform/location";
import type { AsolMapLocation, GpsProvider } from "./types";

function toMapLocation(fix: LocationFix): AsolMapLocation {
  return {
    latitude: fix.latitude,
    longitude: fix.longitude,
    // The map contract requires a number; the platform reports null when the
    // device gives no accuracy estimate.
    accuracy: fix.accuracy ?? 0,
    heading: fix.heading,
    speed: fix.speed,
    timestamp: fix.timestamp,
    source: "capacitor",
  };
}

/** Translate the browser `PositionOptions` the map passes into module options. */
function toLocationOptions(options?: PositionOptions): LocationOptions {
  return {
    accuracy: options?.enableHighAccuracy ? "high" : "balanced",
    ...(options?.timeout !== undefined ? { timeout: options.timeout } : {}),
    ...(options?.maximumAge !== undefined
      ? { maximumAge: options.maximumAge }
      : {}),
  };
}

export function createNativePlatformGpsProvider(): GpsProvider {
  return {
    id: "native-platform",

    isAvailable: () => location.isAvailable(),

    async getCurrentPosition(options) {
      return toMapLocation(
        await location.getCurrentPosition(toLocationOptions(options)),
      );
    },

    async watchPosition(onLocation, onError, options) {
      const handle = await location.watchPosition(
        (fix) => onLocation(toMapLocation(fix)),
        toLocationOptions(options),
        onError,
      );
      return () => {
        void handle.stop();
      };
    },
  };
}
