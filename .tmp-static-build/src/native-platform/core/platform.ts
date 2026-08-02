/**
 * Runtime platform identity for the Native Platform layer.
 *
 * Single responsibility: answer "which platform am I on, and is it native?".
 * Nothing else in the layer may read `Capacitor.getPlatform()` directly.
 */

export type NativePlatformName = "web" | "android" | "ios";

interface CapacitorGlobal {
  getPlatform?: () => string;
  isNativePlatform?: () => boolean;
}

function capacitorGlobal(): CapacitorGlobal | undefined {
  return (globalThis as typeof globalThis & { Capacitor?: CapacitorGlobal })
    .Capacitor;
}

export function getPlatformName(): NativePlatformName {
  const value = capacitorGlobal()?.getPlatform?.();
  return value === "android" || value === "ios" ? value : "web";
}

export function isNativePlatform(): boolean {
  return Boolean(capacitorGlobal()?.isNativePlatform?.());
}

export function isAndroid(): boolean {
  return isNativePlatform() && getPlatformName() === "android";
}

export function isIos(): boolean {
  return isNativePlatform() && getPlatformName() === "ios";
}

/** True when a DOM is available (browser or native WebView). */
export function hasDom(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}
