import { execSync } from 'node:child_process';
import { createHash, sign } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
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
import { createOtaR2Client, otaObjectExists, putOtaObject } from './ota/ota-r2';

const LOCAL_MANIFEST_FILE = 'gova-web-manifest.json';

type CollectedFile = {
  bytes: Buffer;
  sha256: string;
  size: number;
};

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function collectFiles(root: string, current = root, result: Record<string, CollectedFile> = {}) {
  const entries = readdirSync(current).sort((left, right) => left.localeCompare(right));
  for (const entry of entries) {
    const fullPath = path.join(current, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      collectFiles(root, fullPath, result);
      continue;
    }

    const relativePath = path.relative(root, fullPath).replace(/\\/g, '/');
    if (relativePath === LOCAL_MANIFEST_FILE) continue;
    const bytes = readFileSync(fullPath);
    result[relativePath] = {
      bytes,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      size: bytes.byteLength,
    };
  }
  return result;
}

function contentTypeFor(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.html') return 'text/html; charset=utf-8';
  if (extension === '.txt') return 'text/plain; charset=utf-8';
  if (extension === '.json') return 'application/json; charset=utf-8';
  if (extension === '.js') return 'application/javascript; charset=utf-8';
  if (extension === '.css') return 'text/css; charset=utf-8';
  if (extension === '.svg') return 'image/svg+xml';
  if (extension === '.png') return 'image/png';
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  if (extension === '.webp') return 'image/webp';
  if (extension === '.ico') return 'image/x-icon';
  if (extension === '.wasm') return 'application/wasm';
  return 'application/octet-stream';
}

async function main(): Promise<void> {
  loadOtaEnvironment();

  const version = argument('version');
  if (!version || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error('Usage: npm run ota:publish -- --version 1.2.3 [--notes "..."]');
  }

  const notes = argument('notes') ?? '';
  const mandatory = process.argv.includes('--mandatory');
  const minimumNativeVersion = argument('minimum-native-version') ?? '0.0.0';
  const privateKey = getOtaPrivateKey();
  const apiBaseUrl = (
    process.env.GOVA_CAPACITOR_API_BASE_URL ?? CAPACITOR_API_BASE_URL
  ).replace(/\/$/, '');

  const buildEnv: NodeJS.ProcessEnv = {
    ...process.env,
    ...otaClientBuildEnv(version),
    NEXT_PUBLIC_GOVA_API_BASE_URL: apiBaseUrl,
  };

  console.log(`Building OTA file release ${version}...`);
  execSync('npm run build:static', { stdio: 'inherit', env: buildEnv });

  const files = collectFiles(path.resolve('out'));
  const releaseId = `${version}-${Date.now()}`;
  const prefix = getOtaPrefix();
  const releasePrefix = `${prefix}/releases/${version}`;
  const filesPrefix = `${releasePrefix}/files`;
  const baseUrl = `${getOtaPublicBaseUrl()}/${filesPrefix}`;
  const size = Object.values(files).reduce((total, file) => total + file.size, 0);
  const fileManifest = Object.fromEntries(
    Object.entries(files).map(([filePath, file]) => [
      filePath,
      { sha256: file.sha256, size: file.size },
    ]),
  );

  const payload: OtaManifestPayload = {
    schemaVersion: OTA_SCHEMA_VERSION,
    delivery: 'files',
    releaseId,
    version,
    createdAt: new Date().toISOString(),
    baseUrl,
    size,
    fileCount: Object.keys(files).length,
    minimumNativeVersion,
    mandatory,
    notes,
    files: fileManifest,
  };
  const signature = sign('sha256', Buffer.from(canonicalManifestPayload(payload)), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  }).toString('base64');
  const manifest: OtaManifest = { ...payload, signature };
  const manifestJson = JSON.stringify(manifest, null, 2);

  const client = createOtaR2Client();
  if (await otaObjectExists(client, `${releasePrefix}/manifest.json`)) {
    throw new Error(`OTA version ${version} already exists. Publish a new version number.`);
  }

  console.log(`Uploading ${payload.fileCount} files (${Math.ceil(size / 1024)} KB) to R2...`);
  let uploaded = 0;
  for (const [filePath, file] of Object.entries(files)) {
    await putOtaObject(
      client,
      `${filesPrefix}/${filePath}`,
      file.bytes,
      contentTypeFor(filePath),
      'public, max-age=31536000, immutable',
    );
    uploaded += 1;
    if (uploaded === 1 || uploaded % 100 === 0 || uploaded === payload.fileCount) {
      console.log(`  uploaded ${uploaded}/${payload.fileCount}: ${filePath}`);
    }
  }

  await putOtaObject(
    client,
    `${releasePrefix}/manifest.json`,
    manifestJson,
    'application/json',
    'public, max-age=31536000, immutable',
  );
  await putOtaObject(
    client,
    `${prefix}/manifest.json`,
    manifestJson,
    'application/json',
    'no-store, max-age=0',
  );

  console.log(`OTA ${version} published as file-level release`);
  console.log(`Manifest: ${getOtaManifestUrl()}`);
  console.log(`Files: ${payload.fileCount}`);
  console.log(`Total bytes: ${size}`);
}

main().catch((error) => {
  console.error(`OTA publish failed: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
