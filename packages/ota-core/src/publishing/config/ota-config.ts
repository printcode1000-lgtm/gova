import { createPublicKey } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { loadReleaseToolEnvironment } from "@asol/env-core/process";
import { canonicalOtaManifestPayload } from "../../domain/release/signature-payload";
import type { OtaManifestPayload, OtaManifest } from "../../domain/release/manifest-types";

export const OTA_SCHEMA_VERSION = 2;
export const DEFAULT_OTA_PREFIX = "app-updates";
export const DEFAULT_NATIVE_VERSION = "0.0.0";

export type { OtaManifestPayload, OtaManifest };

export function loadOtaEnvironment(): void {
  loadReleaseToolEnvironment();
}

export function getOtaPrefix(): string {
  return (process.env.ASOL_OTA_R2_PREFIX ?? DEFAULT_OTA_PREFIX).replace(
    /^\/+|\/+$/g,
    "",
  );
}

export function getOtaPublicBaseUrl(): string {
  const value = process.env.ASOL_OTA_R2_PUBLIC_URL;
  if (!value) throw new Error("ASOL_OTA_R2_PUBLIC_URL is required");
  return value.replace(/\/$/, "");
}

export function getOtaManifestUrl(): string {
  return `${getOtaPublicBaseUrl()}/${getOtaPrefix()}/manifest.json`;
}

export function getOtaBucketName(): string {
  const value = process.env.ASOL_OTA_R2_BUCKET_NAME;
  if (!value) throw new Error("ASOL_OTA_R2_BUCKET_NAME is required");
  return value;
}

export function getOtaPrivateKey(): string {
  const fromEnv = process.env.ASOL_OTA_SIGNING_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  );
  if (fromEnv) return fromEnv;

  const keyPath = path.resolve(".ota", "private-key.pem");
  if (!existsSync(keyPath)) {
    throw new Error("OTA signing key is missing. Run: npm run ota:keygen");
  }
  return readFileSync(keyPath, "utf8");
}

export function getOtaPublicKeyBase64(privateKey = getOtaPrivateKey()): string {
  const publicKey = createPublicKey(privateKey);
  return Buffer.from(
    publicKey.export({ type: "spki", format: "der" }),
  ).toString("base64");
}

export function canonicalManifestPayload(payload: OtaManifestPayload): string {
  return canonicalOtaManifestPayload(payload);
}

export function otaClientBuildEnv(
  version: string,
  nativeVersion = version,
): Record<string, string> {
  try {
    return {
      ASOL_NEXT_BUILD_ID: `asol-${version}`,
      NEXT_PUBLIC_ASOL_OTA_MANIFEST_URL: getOtaManifestUrl(),
      NEXT_PUBLIC_ASOL_OTA_PUBLIC_KEY: getOtaPublicKeyBase64(),
      NEXT_PUBLIC_ASOL_WEB_BUNDLE_VERSION: version,
      NEXT_PUBLIC_ASOL_NATIVE_VERSION: nativeVersion,
    };
  } catch {
    return {
      ASOL_NEXT_BUILD_ID: `asol-${version}`,
      NEXT_PUBLIC_ASOL_WEB_BUNDLE_VERSION: version,
      NEXT_PUBLIC_ASOL_NATIVE_VERSION: nativeVersion,
    };
  }
}
