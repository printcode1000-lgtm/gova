"use client";

import { publicEnv } from "./public-env";
import type { AppPlatform, AppRuntimeContext } from "./runtime-context";

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
  const isStatic = publicEnv.mode === "static";
  return {
    deployment: isStatic ? "static-export" : publicEnv.mode === "development" ? "local-development" : "web-production",
    platform: currentPlatform,
    dataSource: publicEnv.mode === "development" ? "local" : "cloud",
    isDevelopment: publicEnv.mode === "development",
    isNative,
    isStatic,
    isProvisioning: false,
    supportsServerApi: !isStatic || Boolean(publicEnv.apiBaseUrl),
    supportsOta: isNative && Boolean(publicEnv.otaManifestUrl && publicEnv.otaPublicKey),
  };
}
