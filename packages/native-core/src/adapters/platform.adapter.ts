import { Capacitor } from "@capacitor/core";
import type { NativePlatformName } from "../domain/platform/platform-types";

export function getPlatformName(): NativePlatformName {
  const value = typeof window !== "undefined" ? Capacitor.getPlatform() : "web";
  return value === "android" || value === "ios" ? value : "web";
}

export function isNativePlatform(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

export function isAndroid(): boolean {
  return isNativePlatform() && getPlatformName() === "android";
}

export function isIos(): boolean {
  return isNativePlatform() && getPlatformName() === "ios";
}

export function hasDom(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}
