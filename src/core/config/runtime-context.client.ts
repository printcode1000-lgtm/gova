"use client";

import {
  readGlobalNativePlatform,
  readGlobalPlatformName,
} from "@asol/native-core/platform-globals";

import { publicEnv } from "./public-env";
import {
  resolveClientRuntime,
  type AppPlatform,
  type AppRuntimeContext,
} from "./runtime-context";

export function getClientRuntimeContext(): AppRuntimeContext {
  const currentPlatform: AppPlatform = readGlobalPlatformName();
  const isNative = readGlobalNativePlatform();
  return resolveClientRuntime({
    mode: publicEnv.mode,
    apiBaseUrl: publicEnv.apiBaseUrl,
    platform: currentPlatform,
    native: isNative,
    otaManifestUrl: publicEnv.otaManifestUrl,
    otaPublicKey: publicEnv.otaPublicKey,
  });
}
