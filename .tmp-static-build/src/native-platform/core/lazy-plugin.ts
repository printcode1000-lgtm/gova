/**
 * Lazy, failure-tolerant plugin loading.
 *
 * Single responsibility: import a Capacitor plugin on first use and cache the
 * result, so an uninstalled or web-unsupported plugin degrades into
 * "unavailable" instead of breaking the bundle at import time.
 */

import { NativePlatformError } from "./errors";

type Loader<T> = () => Promise<T>;

interface LazyPlugin<T> {
  /** Resolve the plugin, or `null` when it cannot be loaded. */
  optional(): Promise<T | null>;
  /** Resolve the plugin, or throw `Unavailable`. */
  required(): Promise<T>;
  /** True when the plugin resolved at least once. */
  isLoaded(): boolean;
}

/**
 * @param moduleName Name used in error messages.
 * @param loader Dynamic `import()` returning the plugin object.
 */
export function createLazyPlugin<T>(
  moduleName: string,
  loader: Loader<T>,
): LazyPlugin<T> {
  let cached: T | null | undefined;
  let inFlight: Promise<T | null> | null = null;

  const load = async (): Promise<T | null> => {
    if (cached !== undefined) return cached;
    if (inFlight) return inFlight;

    inFlight = loader()
      .then((plugin) => {
        cached = plugin ?? null;
        return cached;
      })
      .catch(() => {
        // A missing optional dependency is a supported state, not a crash.
        // Do not cache a rejected import. Native startup can briefly expose
        // the bridge before a dynamic chunk/plugin proxy is ready; treating
        // that transient race as permanent disabled the capability for the
        // rest of the application lifetime.
        cached = undefined;
        return null;
      })
      .finally(() => {
        inFlight = null;
      });

    return inFlight;
  };

  return {
    optional: load,
    async required(): Promise<T> {
      const plugin = await load();
      if (!plugin) {
        throw NativePlatformError.unavailable(
          moduleName,
          `${moduleName} requires a native plugin that is not installed or not supported here.`,
        );
      }
      return plugin;
    },
    isLoaded: () => Boolean(cached),
  };
}
