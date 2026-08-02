import { createPublicKey } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { compareOtaCanonicalStrings } from "../../src/features/ota/utils/ota-canonical-order";

export const OTA_SCHEMA_VERSION = 2;
export const DEFAULT_OTA_PREFIX = "app-updates";
export const DEFAULT_NATIVE_VERSION = "0.0.0";

export interface OtaManifestPayload {
  schemaVersion: number;
  delivery: "files";
  releaseId: string;
  version: string;
  createdAt: string;
  baseUrl: string;
  size: number;
  fileCount: number;
  minimumNativeVersion: string;
  requiredCapabilities: string[];
  mandatory: boolean;
  notes: string;
  files: Record<string, { sha256: string; size: number }>;
  bundles?: {
    full: { path: string; sha256: string; size: number };
    deltas: Array<{
      path: string;
      fromVersion: string;
      sha256: string;
      size: number;
    }>;
  };
}

export interface OtaManifest extends OtaManifestPayload {
  signature: string;
}

export function loadOtaEnvironment(): void {
  if (existsSync(".env.local")) dotenv.config({ path: ".env.local" });
  else if (existsSync(".env")) dotenv.config({ path: ".env" });
}

export function getOtaPrefix(): string {
  return (process.env.ASOL_OTA_R2_PREFIX ?? DEFAULT_OTA_PREFIX).replace(
    /^\/+|\/+$/g,
    "",
  );
}

export function getOtaPublicBaseUrl(): string {
  const value =
    process.env.ASOL_OTA_R2_PUBLIC_URL ??
    process.env.PRODUCT_R2_PUBLIC_URL ??
    process.env.R2_PUBLIC_URL;
  if (!value)
    throw new Error(
      "ASOL_OTA_R2_PUBLIC_URL, PRODUCT_R2_PUBLIC_URL, or R2_PUBLIC_URL is required",
    );
  return value.replace(/\/$/, "");
}

export function getOtaManifestUrl(): string {
  return `${getOtaPublicBaseUrl()}/${getOtaPrefix()}/manifest.json`;
}

export function getOtaBucketName(): string {
  const value =
    process.env.ASOL_OTA_R2_BUCKET_NAME ??
    process.env.PRODUCT_R2_BUCKET_NAME ??
    process.env.R2_BUCKET_NAME;
  if (!value)
    throw new Error(
      "ASOL_OTA_R2_BUCKET_NAME, PRODUCT_R2_BUCKET_NAME, or R2_BUCKET_NAME is required",
    );
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
  const sortedFiles = Object.fromEntries(
    Object.entries(payload.files).sort(([left], [right]) =>
      compareOtaCanonicalStrings(left, right),
    ),
  );

  const bundles = payload.bundles
    ? {
        full: {
          path: payload.bundles.full.path,
          sha256: payload.bundles.full.sha256,
          size: payload.bundles.full.size,
        },
        deltas: [...payload.bundles.deltas]
          .sort((left, right) => compareOtaCanonicalStrings(left.fromVersion, right.fromVersion))
          .map((delta) => ({
            path: delta.path,
            fromVersion: delta.fromVersion,
            sha256: delta.sha256,
            size: delta.size,
          })),
      }
    : undefined;

  return JSON.stringify({
    schemaVersion: payload.schemaVersion,
    delivery: payload.delivery,
    releaseId: payload.releaseId,
    version: payload.version,
    createdAt: payload.createdAt,
    baseUrl: payload.baseUrl,
    size: payload.size,
    fileCount: payload.fileCount,
    minimumNativeVersion: payload.minimumNativeVersion,
    requiredCapabilities: [...(payload.requiredCapabilities ?? [])].sort(compareOtaCanonicalStrings),
    mandatory: payload.mandatory,
    notes: payload.notes,
    files: sortedFiles,
    bundles,
  });
}

export function otaClientBuildEnv(
  version: string,
  nativeVersion = version,
): NodeJS.ProcessEnv {
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
