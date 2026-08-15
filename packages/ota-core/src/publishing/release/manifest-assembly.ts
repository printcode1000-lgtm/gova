import { createHash, sign } from "node:crypto";
import {
  OTA_SCHEMA_VERSION,
  canonicalManifestPayload,
} from "../config/ota-config";
import type {
  OtaManifest,
  OtaManifestPayload,
} from "../../domain/release/manifest-types";

export interface CollectedFileEntry {
  bytes: Buffer | Uint8Array;
  sha256: string;
  size: number;
}

export interface AssembleManifestOptions {
  version: string;
  releaseId: string;
  baseUrl: string;
  minimumNativeVersion: string;
  requiredCapabilities: string[];
  optionalCapabilities?: string[];
  mandatory?: boolean;
  notes?: string;
  files: Record<string, { sha256: string; size: number }>;
  bundles?: OtaManifestPayload["bundles"];
  privateKey: string;
  createdAt?: string;
}

export function assembleAndSignManifest(
  options: AssembleManifestOptions,
): OtaManifest {
  const size = Object.values(options.files).reduce(
    (total, file) => total + file.size,
    0,
  );

  const payload: OtaManifestPayload = {
    schemaVersion: OTA_SCHEMA_VERSION,
    delivery: "files",
    releaseId: options.releaseId,
    version: options.version,
    createdAt: options.createdAt ?? new Date().toISOString(),
    baseUrl: options.baseUrl,
    size,
    fileCount: Object.keys(options.files).length,
    minimumNativeVersion: options.minimumNativeVersion,
    requiredCapabilities: options.requiredCapabilities,
    ...(options.optionalCapabilities && options.optionalCapabilities.length > 0
      ? { optionalCapabilities: options.optionalCapabilities }
      : {}),
    mandatory: options.mandatory ?? false,
    notes: options.notes ?? `OTA Release ${options.version}`,
    files: options.files,
    ...(options.bundles ? { bundles: options.bundles } : {}),
  };

  const signature = sign(
    "sha256",
    Buffer.from(canonicalManifestPayload(payload)),
    {
      key: options.privateKey,
      dsaEncoding: "ieee-p1363",
    },
  ).toString("base64");

  return { ...payload, signature };
}
