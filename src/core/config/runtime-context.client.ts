"use client";

import { publicEnv } from "./public-env";
import {
  resolveClientRuntime,
  type AppPlatform,
  type AppRuntimeContext,
} from "./runtime-context";

function platform(): AppPlatform {
  const candidate = (globalThis as typeof globalThis & {
    Capacitor?: { getPlatform?: () => string; isNativePlatform?: () => boolean };
  }).Capacitor;
  const value = candidate?.getPlatform?.();
  return value === "android" || value === "ios" ? value : "web";
}

export function getClientRuntimeContext(): AppRuntimeContext {
  const currentPlatform = platform();
  const isNative = Boolean(
    (globalThis as typeof globalThis & { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor?.isNativePlatform?.(),
  );
  return resolveClientRuntime({
    mode: publicEnv.mode,
    apiBaseUrl: publicEnv.apiBaseUrl,
    platform: currentPlatform,
    native: isNative,
    otaManifestUrl: publicEnv.otaManifestUrl,
    otaPublicKey: publicEnv.otaPublicKey,
  });
}
