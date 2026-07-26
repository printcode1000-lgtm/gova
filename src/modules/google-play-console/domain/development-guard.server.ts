import "server-only";

import path from "node:path";

import { isDevRuntime } from "@/core/config";

import type {
  GooglePlayConsoleConfigStatus,
  GooglePlayConsoleEnvironment,
} from "./types";

const DEFAULT_PACKAGE_NAME = "hgh.asol.app";
const DEFAULT_KEY_FILE = "assets/google-play/asole-73f1f-dc494a4b5159.json";

export function googlePlayConsoleEnvironment(): GooglePlayConsoleEnvironment {
  return {
    allowed: isDevRuntime(),
    nodeEnv: process.env.NODE_ENV ?? "",
    publicMode: process.env.NEXT_PUBLIC_ASOL_MODE ?? "",
    vercel: Boolean(process.env.VERCEL || process.env.VERCEL_ENV),
  };
}

export function assertGooglePlayConsoleAllowed(): void {
  if (!googlePlayConsoleEnvironment().allowed) {
    throw new Error("googlePlayConsoleDevelopmentOnly");
  }
}

export function resolveGooglePlayConsoleConfig(): Pick<
  GooglePlayConsoleConfigStatus,
  "packageName" | "keyFilePath"
> {
  return {
    packageName:
      process.env.ASOL_ANDROID_PACKAGE_NAME?.trim() ||
      process.env.GOOGLE_PLAY_PACKAGE_NAME?.trim() ||
      DEFAULT_PACKAGE_NAME,
    keyFilePath: path.resolve(
      process.cwd(),
      process.env.GOOGLE_PLAY_JSON_KEY_FILE?.trim() || DEFAULT_KEY_FILE,
    ),
  };
}
