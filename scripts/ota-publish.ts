import { createHash, sign } from 'node:crypto';
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { zipSync } from 'fflate';
import { CAPACITOR_API_BASE_URL } from '../platform/capacitor.defaults';
import {
  OTA_SCHEMA_VERSION,
  canonicalManifestPayload,
  getOtaManifestUrl,
  getOtaPrefix,
  getOtaPrivateKey,
  getOtaPublicBaseUrl,
  loadOtaEnvironment,
  otaClientBuildEnv,
  type OtaManifest,
  type OtaManifestPayload,
} from './ota/ota-config';
import { createOtaR2Client, putOtaObject } from './ota/ota-r2';

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function collectFiles(root: string, current = root, result: Record<string, Uint8Array> = {}) {
  for (const entry of readdirSync(current)) {
    const fullPath = path.join(current, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) collectFiles(root, fullPath, result);
    else result[path.relative(root, fullPath).replace(/\\/g, '/')] = readFileSync(fullPath);
  }
  return result;
}

async function main(): Promise<void> {
loadOtaEnvironment();

const version = argument('version');
if (!version || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error('Usage: npm run ota:publish -- --version 1.2.3 [--notes "..."]');
}

const notes = argument('notes') ?? '';
const mandatory = process.argv.includes('--mandatory');
const minimumNativeVersion = argument('minimum-native-version') ?? '1.0.0';
const privateKey = getOtaPrivateKey();
const apiBaseUrl = (
  process.env.GOVA_CAPACITOR_API_BASE_URL ?? CAPACITOR_API_BASE_URL
).replace(/\/$/, '');

const buildEnv: NodeJS.ProcessEnv = {
  ...process.env,
  ...otaClientBuildEnv(version),
  NEXT_PUBLIC_GOVA_API_BASE_URL: apiBaseUrl,
};

console.log(`🔨 Building OTA web bundle ${version}...`);
execSync('npm run build:static', { stdio: 'inherit', env: buildEnv });

const files = collectFiles(path.resolve('out'));
const archive = Buffer.from(zipSync(files, { level: 9 }));
const sha256 = createHash('sha256').update(archive).digest('hex');
const releaseId = `${version}-${Date.now()}`;
const prefix = getOtaPrefix();
const releasePrefix = `${prefix}/releases/${version}`;
const bundleKey = `${releasePrefix}/web-bundle.zip`;
const bundleUrl = `${getOtaPublicBaseUrl()}/${bundleKey}`;

const payload: OtaManifestPayload = {
  schemaVersion: OTA_SCHEMA_VERSION,
  releaseId,
  version,
  createdAt: new Date().toISOString(),
  bundleUrl,
  size: archive.byteLength,
  sha256,
  minimumNativeVersion,
  mandatory,
  notes,
};
const signature = sign('sha256', Buffer.from(canonicalManifestPayload(payload)), {
  key: privateKey,
  dsaEncoding: 'ieee-p1363',
}).toString('base64');
const manifest: OtaManifest = { ...payload, signature };
const manifestJson = JSON.stringify(manifest, null, 2);

const client = createOtaR2Client();
console.log(`⬆️ Uploading ${Math.ceil(archive.byteLength / 1024)} KB to R2...`);
await putOtaObject(client, bundleKey, archive, 'application/zip', 'public, max-age=31536000, immutable');
await putOtaObject(client, `${releasePrefix}/manifest.json`, manifestJson, 'application/json', 'public, max-age=31536000, immutable');

// Publish the channel manifest last. Applications cannot discover the release
// until both immutable release objects are safely available.
await putOtaObject(client, `${prefix}/manifest.json`, manifestJson, 'application/json', 'no-store, max-age=0');

console.log(`✅ OTA ${version} published`);
console.log(`Manifest: ${getOtaManifestUrl()}`);
console.log(`SHA-256: ${sha256}`);
}

main().catch((error) => {
  console.error(`❌ OTA publish failed: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
