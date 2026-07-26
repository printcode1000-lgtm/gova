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

export function resolveGooglePlayServiceAccountEnvironment() {
  return {
    jsonBase64: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64?.trim() ?? "",
    type: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_TYPE || "service_account",
    projectId: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_PROJECT_ID,
    privateKeyId: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY_ID,
    privateKeyBase64:
      process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY_BASE64?.trim() ?? "",
    clientEmail:
      process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_CLIENT_EMAIL?.trim() ||
      process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL?.trim() ||
      "",
    clientId:
      process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_CLIENT_ID ||
      process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_UNIQUE_ID,
    authUri:
      process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_AUTH_URI ||
      "https://accounts.google.com/o/oauth2/auth",
    tokenUri:
      process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_TOKEN_URI ||
      "https://oauth2.googleapis.com/token",
    authProviderX509CertUrl:
      process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL ||
      "https://www.googleapis.com/oauth2/v1/certs",
    clientX509CertUrl:
      process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_CLIENT_X509_CERT_URL,
    universeDomain:
      process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_UNIVERSE_DOMAIN || "googleapis.com",
  };
}

export function googlePlayFastlaneEnvironment() {
  return { ...process.env };
}
