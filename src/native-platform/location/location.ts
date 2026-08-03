/**
 * Public Location API.
 *
 * Single responsibility: produce normalized position fixes, on both the
 * Capacitor Geolocation plugin and the browser Geolocation API, while
 * distinguishing "permission refused" from "GPS switched off".
 *
 * Background location tracking is intentionally not supported.
 */

import { NativePlatformError, toNativeError } from "../core/errors";
import { createLazyPlugin } from "../core/lazy-plugin";
import { hasDom, isNativePlatform } from "../core/platform";
import { permissionManager } from "../permissions/permission-manager";
import { PermissionKinds } from "../permissions/types";
import {
  ACCURACY_REQUIRES_HIGH,
  DEFAULT_TIMEOUT_MS,
  type LocationErrorListener,
  type LocationFix,
  type LocationListener,
  type LocationOptions,
  type WatchHandle,
} from "./types";

const MODULE = "Location";

interface PluginPosition {
  coords: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    altitude?: number | null;
    altitudeAccuracy?: number | null;
    heading?: number | null;
    speed?: number | null;
  };
  timestamp: number;
}

interface GeolocationPluginApi {
  getCurrentPosition: (options: Record<string, unknown>) => Promise<PluginPosition>;
  watchPosition: (
    options: Record<string, unknown>,
    callback: (position: PluginPosition | null, error?: unknown) => void,
  ) => Promise<string>;
  clearWatch: (options: { id: string }) => Promise<void>;
}

const geolocationPlugin = createLazyPlugin(MODULE, async () => {
  const { Geolocation } = await import("@capacitor/geolocation");
  // Boxed: returning the proxy itself would make this promise call its
  // then() on the native bridge.
  return { plugin: Geolocation as unknown as GeolocationPluginApi };
});

function toFix(position: PluginPosition | GeolocationPosition): LocationFix {
  const coords = position.coords;
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy ?? null,
    altitude: coords.altitude ?? null,
    altitudeAccuracy: coords.altitudeAccuracy ?? null,
    heading: coords.heading ?? null,
    speed: coords.speed ?? null,
    timestamp: position.timestamp,
  };
}

/**
 * A position error caused by the device location service being off, rather
 * than by a refused permission. Browsers report this as POSITION_UNAVAILABLE;
 * native plugins put it in the message.
 */
function isServiceDisabled(error: unknown): boolean {
  const code = (error as { code?: number } | null)?.code;
  if (code === 2) return true;
  const message = String(
    (error as { message?: string } | null)?.message ?? "",
  ).toLowerCase();
  return (
    message.includes("location services are not enabled") ||
    message.includes("location disabled") ||
    message.includes("location unavailable") ||
    message.includes("gps")
  );
}

function normalize(error: unknown): NativePlatformError {
  if (isServiceDisabled(error)) {
    return NativePlatformError.serviceDisabled(
      MODULE,
      "Device location services are turned off.",
    );
  }
  const code = (error as { code?: number } | null)?.code;
  if (code === 1) return NativePlatformError.permissionDenied(MODULE);
  if (code === 3) return NativePlatformError.timeout(MODULE, DEFAULT_TIMEOUT_MS);
  return toNativeError(MODULE, error);
}

function pluginOptions(options: LocationOptions): Record<string, unknown> {
  return {
    enableHighAccuracy: ACCURACY_REQUIRES_HIGH[options.accuracy ?? "balanced"],
    timeout: options.timeout ?? DEFAULT_TIMEOUT_MS,
    maximumAge: options.maximumAge ?? 0,
  };
}

export class LocationModule {
  private readonly watches = new Map<string, () => Promise<void>>();

  /** True when some positioning source exists on this platform. */
  async isAvailable(): Promise<boolean> {
    if (isNativePlatform()) {
      return Boolean((await geolocationPlugin.optional())?.plugin ?? null);
    }
    return hasDom() && Boolean(navigator.geolocation);
  }

  /**
   * True when the OS location service itself is enabled.
   * A `false` here cannot be fixed by granting a permission.
   */
  async isServiceEnabled(): Promise<boolean> {
    try {
      await this.getCurrentPosition({ timeout: 5_000, maximumAge: 60_000 });
      return true;
    } catch (error) {
      if (
        error instanceof NativePlatformError &&
        error.code === "service-disabled"
      ) {
        return false;
      }
      // Any other failure (denied, timeout) does not prove the service is off.
      return true;
    }
  }

  /** One-shot position fix. */
  async getCurrentPosition(
    options: LocationOptions = {},
  ): Promise<LocationFix> {
    await this.ensurePermission();

    if (isNativePlatform()) {
      const plugin = (await geolocationPlugin.required()).plugin;
      try {
        return toFix(await plugin.getCurrentPosition(pluginOptions(options)));
      } catch (error) {
        throw normalize(error);
      }
    }

    if (!hasDom() || !navigator.geolocation) {
      throw NativePlatformError.unavailable(MODULE);
    }

    return new Promise<LocationFix>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(toFix(position)),
        (error) => reject(normalize(error)),
        {
          enableHighAccuracy:
            ACCURACY_REQUIRES_HIGH[options.accuracy ?? "balanced"],
          timeout: options.timeout ?? DEFAULT_TIMEOUT_MS,
          maximumAge: options.maximumAge ?? 0,
        },
      );
    });
  }

  /**
   * Continuous foreground updates.
   * Always pair with the returned `stop()`; the module keeps no global state
   * that would survive a page navigation.
   */
  async watchPosition(
    listener: LocationListener,
    options: LocationOptions = {},
    onError?: LocationErrorListener,
  ): Promise<WatchHandle> {
    await this.ensurePermission();

    if (isNativePlatform()) {
      const plugin = (await geolocationPlugin.required()).plugin;
      const id = await plugin.watchPosition(
        pluginOptions(options),
        (position, error) => {
          if (error) {
            onError?.(normalize(error));
            return;
          }
          if (position) listener(toFix(position));
        },
      );

      const stop = async () => {
        if (!this.watches.has(id)) return;
        this.watches.delete(id);
        await plugin.clearWatch({ id }).catch(() => {
          // Clearing an already-cleared watch is not an error.
        });
      };
      this.watches.set(id, stop);
      return { stop };
    }

    if (!hasDom() || !navigator.geolocation) {
      throw NativePlatformError.unavailable(MODULE);
    }

    const browserId = navigator.geolocation.watchPosition(
      (position) => listener(toFix(position)),
      (error) => onError?.(normalize(error)),
      {
        enableHighAccuracy:
          ACCURACY_REQUIRES_HIGH[options.accuracy ?? "balanced"],
        timeout: options.timeout ?? DEFAULT_TIMEOUT_MS,
        maximumAge: options.maximumAge ?? 0,
      },
    );

    const key = `web:${browserId}`;
    const stop = async () => {
      if (!this.watches.has(key)) return;
      this.watches.delete(key);
      navigator.geolocation.clearWatch(browserId);
    };
    this.watches.set(key, stop);
    return { stop };
  }

  /** Stop every watch this module started. */
  async stopAllWatches(): Promise<void> {
    await Promise.all([...this.watches.values()].map((stop) => stop()));
  }

  /** Open the OS settings so the user can enable location or grant access. */
  openSettings(): Promise<boolean> {
    return permissionManager.openSettings();
  }

  private async ensurePermission(): Promise<void> {
    const permission = await permissionManager.requestIfNeeded(
      PermissionKinds.Location,
    );
    if (permission.state === "unsupported") return;
    if (!permission.granted) {
      throw NativePlatformError.permissionDenied(
        MODULE,
        permission.requiresSettings
          ? "Location access is blocked. Enable it from the application settings."
          : "Location access was not granted.",
      );
    }
  }
}

export const location = new LocationModule();
