import { NativeCoreError } from "../errors/native-core-error";
import { hasDom, isNativePlatform } from "./platform.adapter";

type Loader<T> = () => Promise<T>;

/**
 * Whether a Capacitor plugin may be touched at all on this host.
 *
 * Several Capacitor web implementations register DOM listeners in their
 * constructor, and Capacitor instantiates them during an internal load that
 * callers never await. On a host with neither a native bridge nor a DOM —
 * Node, and any server-side render — that constructor throws where nothing can
 * catch it, taking the process down instead of failing the one call.
 *
 * Refusing before the plugin is reached turns that crash into the ordinary
 * "unavailable" failure every public method already returns.
 */
function canReachPlugins(): boolean {
  return isNativePlatform() || hasDom();
}

export interface LazyPlugin<T> {
  optional(): Promise<T | null>;
  required(): Promise<T>;
  isLoaded(): boolean;
}

export function createLazyPlugin<T>(
  moduleName: string,
  loader: Loader<T>,
): LazyPlugin<T> {
  let cached: T | null | undefined;
  let inFlight: Promise<T | null> | null = null;

  const load = async (): Promise<T | null> => {
    // Checked on every call rather than cached: the DOM appears partway through
    // a server-rendered page's life, so a "no" now is not a "no" forever.
    if (!canReachPlugins()) return null;
    if (cached !== undefined) return cached;
    if (inFlight) return inFlight;

    inFlight = loader()
      .then((plugin) => {
        cached = plugin ?? null;
        return cached;
      })
      .catch(() => {
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
        throw NativeCoreError.unavailable(
          moduleName,
          `${moduleName} requires a native plugin that is not installed or not supported here.`,
        );
      }
      return plugin;
    },
    isLoaded: () => Boolean(cached),
  };
}
