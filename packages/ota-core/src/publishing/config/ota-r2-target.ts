import { createPublicKey } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export interface OtaR2Target {
  accountId: string;
  endpoint: string;
  bucketName: string;
  publicUrl: string;
  location: string;
  jurisdiction: 'default' | 'eu' | 'fedramp';
}

export const OTA_R2_STORAGE_TARGET: OtaR2Target = {
  accountId: '21fce63d15897aaa0b68fae1360a1810',
  endpoint: 'https://21fce63d15897aaa0b68fae1360a1810.r2.cloudflarestorage.com',
  bucketName: 'ota',
  publicUrl: 'https://pub-ee70bc6c84c54d9b8a8ba44c6f7820a9.r2.dev',
  location: 'WEUR',
  jurisdiction: 'default',
};

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required OTA environment variable: ${key}`);
  }
  return value;
}

function normalizeUrl(value: string): string {
  return value.trim().replace(/\/+$/, '').toLowerCase();
}

export function assertOtaR2TargetFields(actual: Partial<OtaR2Target>): void {
  const expected = OTA_R2_STORAGE_TARGET;
  const mismatches: string[] = [];

  if (actual.accountId !== undefined && actual.accountId.trim() !== expected.accountId) {
    mismatches.push('accountId');
  }
  if (
    actual.endpoint !== undefined &&
    normalizeUrl(actual.endpoint) !== normalizeUrl(expected.endpoint)
  ) {
    mismatches.push('endpoint');
  }
  if (actual.bucketName !== undefined && actual.bucketName.trim() !== expected.bucketName) {
    mismatches.push('bucketName');
  }
  if (
    actual.publicUrl !== undefined &&
    normalizeUrl(actual.publicUrl) !== normalizeUrl(expected.publicUrl)
  ) {
    mismatches.push('publicUrl');
  }

  if (mismatches.length > 0) {
    throw new Error(`r2StorageTargetMismatch:ota:${mismatches.join(',')}`);
  }
}

export function getOtaR2CloudflareCredentials() {
  const credentials = {
    accountId: requireEnv('ASOL_OTA_R2_ACCOUNT_ID'),
    apiToken: requireEnv('ASOL_OTA_R2_API_TOKEN'),
  };
  assertOtaR2TargetFields({ accountId: credentials.accountId });
  return credentials;
}

export function getOtaR2S3Credentials() {
  const credentials = {
    accessKeyId: requireEnv('ASOL_OTA_R2_ACCESS_KEY_ID'),
    secretAccessKey: requireEnv('ASOL_OTA_R2_SECRET_ACCESS_KEY'),
    endpoint: requireEnv('ASOL_OTA_R2_ENDPOINT'),
    bucketName: requireEnv('ASOL_OTA_R2_BUCKET_NAME'),
    location: process.env.ASOL_OTA_R2_LOCATION ?? 'WEUR',
    jurisdiction: (process.env.ASOL_OTA_R2_JURISDICTION ?? 'default') as OtaR2Target['jurisdiction'],
  };
  assertOtaR2TargetFields(credentials);
  return credentials;
}

export function getOtaR2PublicUrl(): string {
  return requireEnv('ASOL_OTA_R2_PUBLIC_URL');
}

export function getOtaR2Config() {
  const cloudflare = getOtaR2CloudflareCredentials();
  const s3 = getOtaR2S3Credentials();
  const publicUrl = getOtaR2PublicUrl();
  assertOtaR2TargetFields({
    accountId: cloudflare.accountId,
    endpoint: s3.endpoint,
    bucketName: s3.bucketName,
    publicUrl,
  });
  return { cloudflare, s3, publicUrl };
}

export function getOtaApprovalServerConfig(): {
  manifestUrl: string;
  publicKey: string;
} {
  const explicitManifestUrl = process.env.NEXT_PUBLIC_ASOL_OTA_MANIFEST_URL?.trim();
  // ASOL_OTA_R2_PUBLIC_URL only. Falling back to the product or general bucket
  // would point clients at a manifest on an account that OTA does not own.
  const publicBaseUrl = (process.env.ASOL_OTA_R2_PUBLIC_URL || '').replace(/\/$/, '');
  const prefix = (process.env.ASOL_OTA_R2_PREFIX || 'app-updates').replace(/^\/+|\/+$/g, '');
  const manifestUrl =
    explicitManifestUrl || (publicBaseUrl ? `${publicBaseUrl}/${prefix}/manifest.json` : '');

  let publicKey = (
    process.env.ASOL_OTA_PUBLIC_KEY ||
    process.env.NEXT_PUBLIC_ASOL_OTA_PUBLIC_KEY ||
    ''
  ).trim();

  const localPublicKeyPath = path.resolve('.ota', 'public-key.pem');
  if (!publicKey) {
    if (existsSync(localPublicKeyPath)) {
      publicKey = createPublicKey(readFileSync(localPublicKeyPath))
        .export({ format: 'der', type: 'spki' })
        .toString('base64');
    }
  }
  if (!publicKey) {
    const privateKey = process.env.ASOL_OTA_SIGNING_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const localPrivateKeyPath = path.resolve('.ota', 'private-key.pem');
    const source =
      privateKey || (existsSync(localPrivateKeyPath) ? readFileSync(localPrivateKeyPath) : null);
    if (source) {
      publicKey = createPublicKey(source)
        .export({ format: 'der', type: 'spki' })
        .toString('base64');
    }
  }

  if (!manifestUrl || !publicKey) throw new Error('otaNotConfigured');
  return { manifestUrl, publicKey };
}
