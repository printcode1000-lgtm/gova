/**
 * Server-only secrets and credentials (Node / build scripts).
 * Next.js app code should import from server-env.ts instead.
 */

export function getTursoRuntimeCredentials(): { url: string; authToken: string } {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) throw new Error('TURSO_DATABASE_URL environment variable is not set');
  if (!authToken) throw new Error('TURSO_AUTH_TOKEN environment variable is not set');

  return { url, authToken };
}

export function getTursoPlatformCredentials(): { apiToken: string; organization: string } {
  const apiToken = process.env.TURSO_API_TOKEN;
  const organization = process.env.TURSO_ORGANIZATION;

  if (!apiToken) throw new Error('TURSO_API_TOKEN is required for Turso provisioning');
  if (!organization) throw new Error('TURSO_ORGANIZATION is required for Turso provisioning');

  return { apiToken, organization };
}

export function getCorsOrigins(): string[] {
  const fromEnv = process.env.GOVA_CORS_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean);
  if (fromEnv?.length) return fromEnv;

  return [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'capacitor://localhost',
    'https://localhost',
    'http://localhost',
    'ionic://localhost',
  ];
}

export function readOptionalEnv(key: string): string | undefined {
  return process.env[key];
}

export function writeTursoRuntimeCredentials(url: string, authToken: string): void {
  process.env.TURSO_DATABASE_URL = url;
  process.env.TURSO_AUTH_TOKEN = authToken;
}

export function getTursoProfileRuntimeCredentials(): { url: string; authToken: string } {
  const url = process.env.TURSO_PROFILE_DATABASE_URL;
  const authToken = process.env.TURSO_PROFILE_AUTH_TOKEN;

  if (!url) throw new Error('TURSO_PROFILE_DATABASE_URL environment variable is not set');
  if (!authToken) throw new Error('TURSO_PROFILE_AUTH_TOKEN environment variable is not set');

  return { url, authToken };
}

export function writeTursoProfileRuntimeCredentials(url: string, authToken: string): void {
  process.env.TURSO_PROFILE_DATABASE_URL = url;
  process.env.TURSO_PROFILE_AUTH_TOKEN = authToken;
}

export interface R2CloudflareCredentials {
  accountId: string;
  apiToken: string;
}

export interface R2S3Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  bucketName: string;
  location: string;
  jurisdiction: 'default' | 'eu' | 'fedramp';
}

export interface R2Config {
  cloudflare: R2CloudflareCredentials;
  s3: R2S3Credentials;
  publicUrl: string;
  catalogUri: string;
  warehouseName: string;
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} environment variable is not set`);
  return value;
}

export function getR2CloudflareCredentials(): R2CloudflareCredentials {
  return {
    accountId: requireEnv('R2_ACCOUNT_ID'),
    apiToken: requireEnv('R2_API_TOKEN'),
  };
}

export function getR2S3Credentials(): R2S3Credentials {
  const jurisdiction = (readOptionalEnv('R2_JURISDICTION') ?? 'default') as R2S3Credentials['jurisdiction'];
  return {
    accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
    secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
    endpoint: requireEnv('R2_ENDPOINT'),
    bucketName: requireEnv('R2_BUCKET_NAME'),
    location: readOptionalEnv('R2_LOCATION') ?? 'WEUR',
    jurisdiction,
  };
}

export function getR2Config(): R2Config {
  return {
    cloudflare: getR2CloudflareCredentials(),
    s3: getR2S3Credentials(),
    publicUrl: requireEnv('R2_PUBLIC_URL'),
    catalogUri: readOptionalEnv('R2_CATALOG_URI') ?? '',
    warehouseName: readOptionalEnv('R2_WAREHOUSE_NAME') ?? '',
  };
}
