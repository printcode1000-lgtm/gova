import { createPublicKey } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

export const OTA_SCHEMA_VERSION = 1;
export const DEFAULT_OTA_PREFIX = 'app-updates';
export const DEFAULT_NATIVE_VERSION = '1.0.0';

export interface OtaManifestPayload {
  schemaVersion: number;
  releaseId: string;
  version: string;
  createdAt: string;
  bundleUrl: string;
  size: number;
  sha256: string;
  minimumNativeVersion: string;
  mandatory: boolean;
  notes: string;
}

export interface OtaManifest extends OtaManifestPayload {
  signature: string;
}

export function loadOtaEnvironment(): void {
  if (existsSync('.env.local')) dotenv.config({ path: '.env.local' });
  else if (existsSync('.env')) dotenv.config({ path: '.env' });
}

export function getOtaPrefix(): string {
  return (process.env.GOVA_OTA_R2_PREFIX ?? DEFAULT_OTA_PREFIX).replace(/^\/+|\/+$/g, '');
}

export function getOtaPublicBaseUrl(): string {
  const value = process.env.GOVA_OTA_R2_PUBLIC_URL ?? process.env.R2_PUBLIC_URL;
  if (!value) throw new Error('GOVA_OTA_R2_PUBLIC_URL or R2_PUBLIC_URL is required');
  return value.replace(/\/$/, '');
}

export function getOtaManifestUrl(): string {
  return `${getOtaPublicBaseUrl()}/${getOtaPrefix()}/manifest.json`;
}

export function getOtaBucketName(): string {
  const value = process.env.GOVA_OTA_R2_BUCKET_NAME ?? process.env.R2_BUCKET_NAME;
  if (!value) throw new Error('GOVA_OTA_R2_BUCKET_NAME or R2_BUCKET_NAME is required');
  return value;
}

export function getOtaPrivateKey(): string {
  const fromEnv = process.env.GOVA_OTA_SIGNING_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (fromEnv) return fromEnv;

  const keyPath = path.resolve('.ota', 'private-key.pem');
  if (!existsSync(keyPath)) {
    throw new Error('OTA signing key is missing. Run: npm run ota:keygen');
  }
  return readFileSync(keyPath, 'utf8');
}

export function getOtaPublicKeyBase64(privateKey = getOtaPrivateKey()): string {
  const publicKey = createPublicKey(privateKey);
  return Buffer.from(publicKey.export({ type: 'spki', format: 'der' })).toString('base64');
}

export function canonicalManifestPayload(payload: OtaManifestPayload): string {
  return JSON.stringify({
    schemaVersion: payload.schemaVersion,
    releaseId: payload.releaseId,
    version: payload.version,
    createdAt: payload.createdAt,
    bundleUrl: payload.bundleUrl,
    size: payload.size,
    sha256: payload.sha256,
    minimumNativeVersion: payload.minimumNativeVersion,
    mandatory: payload.mandatory,
    notes: payload.notes,
  });
}

export function otaClientBuildEnv(version: string): NodeJS.ProcessEnv {
  try {
    return {
      NEXT_PUBLIC_GOVA_OTA_MANIFEST_URL: getOtaManifestUrl(),
      NEXT_PUBLIC_GOVA_OTA_PUBLIC_KEY: getOtaPublicKeyBase64(),
      NEXT_PUBLIC_GOVA_WEB_BUNDLE_VERSION: version,
    };
  } catch {
    return {
      NEXT_PUBLIC_GOVA_WEB_BUNDLE_VERSION: version,
    };
  }
}
