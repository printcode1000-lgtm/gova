import type { NativePlatformName } from "./platform-types";

/**
 * Platform identity read from the bridge Capacitor installs on `globalThis`, with no
 * `@capacitor/*` import of any kind.
 *
 * `adapters/platform.adapter.ts` is the device door and asks the plugin directly. This module
 * exists for the callers that must not pull a Capacitor dependency into their bundle at all —
 * the configuration leaf `src/core/config/runtime-context.client.ts` is read by the server and
 * by every service deployment, and an adapter import there would drag the plugin tree into all
 * of them (rule 9).
 *
 * Both answers come from the same bridge; keeping the *reading* of it in one file is what stops
 * the two from disagreeing the first time either changes.
 */
interface CapacitorGlobalBridge {
  getPlatform?: () => string;
  isNativePlatform?: () => boolean;
}

function bridge(): CapacitorGlobalBridge | undefined {
  return (globalThis as typeof globalThis & { Capacitor?: CapacitorGlobalBridge }).Capacitor;
}

/** `"android" | "ios"` when the bridge reports one, `"web"` in every other case. */
export function readGlobalPlatformName(): NativePlatformName {
  const value = bridge()?.getPlatform?.();
  return value === "android" || value === "ios" ? value : "web";
}

/** Whether the bridge reports a native container. Absent bridge means web, never a throw. */
export function readGlobalNativePlatform(): boolean {
  return Boolean(bridge()?.isNativePlatform?.());
}
