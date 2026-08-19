/**
 * Map GPS provider backed by the Native Platform Location module.
 *
 * Single responsibility: adapt `NativeCore.getCurrentPosition` / `NativeCore.watchPosition` to the map's
 * `GpsProvider` shape. It is the default provider for every ASOL map, so the
 * map never talks to `navigator.geolocation` and inherits permission handling,
 * GPS-disabled detection, and the unified error taxonomy for free.
 */

import {
  NativeCore,
  PermissionKinds,
  PermissionStates,
  isNativePlatform,
} from "@asol/native-core";
import type { LocationFix, LocationOptions, PermissionState } from "@asol/native-core";
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

/**
 * Raised instead of a bare positioning failure so a host can tell the three cases
 * apart and react correctly: a first-time refusal can be asked again, a blocked
 * permission needs the OS settings screen, and an unsupported platform needs the
 * control hidden rather than retried.
 */
export class MapLocationPermissionError extends Error {
  readonly state: PermissionState;
  readonly requiresSettings: boolean;

  constructor(state: PermissionState, requiresSettings: boolean) {
    super(`Location permission is ${state}.`);
    this.name = "MapLocationPermissionError";
    this.state = state;
    this.requiresSettings = requiresSettings;
  }
}

/**
 * Resolve the permission before any positioning call.
 *
 * Capacitor's Android and iOS bridges reject with a generic error when the
 * permission is missing, and the browser rejects with a `PositionError` — three
 * shapes for one situation. Asking first turns all of them into one explicit
 * decision, and it is what makes the first tap on the GPS control actually raise
 * the OS prompt instead of failing silently.
 */
async function ensureLocationPermission(): Promise<void> {
  const checked = await NativeCore.checkPermission(PermissionKinds.Location);
  if (!checked.ok) throw checked.error;

  if (checked.value.granted) return;

  if (
    checked.value.state === PermissionStates.Blocked ||
    checked.value.state === PermissionStates.Unsupported
  ) {
    throw new MapLocationPermissionError(
      checked.value.state,
      checked.value.requiresSettings,
    );
  }

  const requested = await NativeCore.requestPermission(PermissionKinds.Location);
  if (!requested.ok) throw requested.error;
  if (requested.value.granted) return;

  throw new MapLocationPermissionError(
    requested.value.state,
    requested.value.requiresSettings,
  );
}

export function createNativePlatformGpsProvider(): GpsProvider {
  return {
    id: "native-platform",

    isAvailable: () => isNativePlatform() || (typeof navigator !== "undefined" && "geolocation" in navigator),

    async getCurrentPosition(options) {
      await ensureLocationPermission();
      const res = await NativeCore.getCurrentPosition(toLocationOptions(options));
      if (!res.ok) {
        throw res.error;
      }
      return toMapLocation(res.value);
    },

    async watchPosition(onLocation, onError, options) {
      try {
        await ensureLocationPermission();
      } catch (error) {
        onError?.(error);
        return () => {};
      }

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
