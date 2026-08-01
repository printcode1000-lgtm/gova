import { execSync } from 'node:child_process';
import { createHash, sign } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { CAPACITOR_API_BASE_URL } from '../platform/capacitor.defaults';
import { withoutVsCodeDebuggerEnv } from './child-process-env';
import {
  formatReport,
  inspectNativeCompatibility,
  resolveNativeBaseline,
} from './ota/ota-native-compatibility';
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
import {
  createOtaR2Client,
  deleteOtaObjects,
  getOtaManifestObject,
  listOtaObjectKeys,
  otaObjectExists,
  putOtaObject,
} from './ota/ota-r2';

const LOCAL_MANIFEST_FILE = 'asol-web-manifest.json';

type CollectedFile = {
  bytes: Buffer;
  sha256: string;
  size: number;
};

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
    if (relativePath.split('/').some((segment) => segment.startsWith('.'))) continue;
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
  // CapacitorHttp parses application/json before honoring arraybuffer, which
  // destroys the original bytes required for OTA SHA-256 verification.
  if (extension === '.json') return 'application/octet-stream';
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

function nextPatchVersion(current: string): string {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/.exec(current);
  if (!match) throw new Error(`R2 manifest has an invalid version: ${current}`);
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
}

function automaticNotes(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '00';
  return `Automatic build - ${value('year')}-${value('month')}-${value('day')} ${value('hour')}:${value('minute')}:${value('second')} Africa/Cairo`;
}

/**
 * Enforce the golden rule before anything is uploaded.
 *
 * OTA ships UI and logic that run inside the native capabilities already
 * installed on the device. Any new device capability is a store release.
 *
 * @returns The `minimumNativeVersion` to stamp into the manifest.
 * @throws When the native shell changed and the publisher has not declared a
 *         new minimum version.
 */
function assertNativeCompatibility(): string {
  const baseline = resolveNativeBaseline();
  const report = inspectNativeCompatibility(baseline);
  const declared = process.env.ASOL_OTA_MINIMUM_NATIVE_VERSION?.trim();

  console.log('\nOTA native compatibility');
  console.log(formatReport(report, baseline));

  if (!baseline) {
    throw new Error(
      'Cannot prove OTA native compatibility: no native baseline found.\n' +
        'Tag the commit the current store build was made from, for example:\n' +
        '  git tag native-v1.0.0 && git push origin native-v1.0.0\n' +
        'Or set ASOL_OTA_NATIVE_BASELINE to that commit.',
    );
  }

  if (report.requiresStoreRelease && !declared) {
    throw new Error(
      'Refusing to publish: the native shell changed since the last store release.\n' +
        'A web bundle that needs a capability the installed shell lacks degrades\n' +
        'silently instead of failing loudly.\n\n' +
        formatReport(report, baseline) +
        '\n\nEither publish a new store build and re-tag the baseline, or, if this\n' +
        'bundle genuinely runs on the older shell, declare the requirement:\n' +
        '  ASOL_OTA_MINIMUM_NATIVE_VERSION=<version> npm run ota:publish',
    );
  }

  // No native surface changed: the bundle runs on any shell that already
  // serves the current release line.
  const resolved = declared || process.env.NEXT_PUBLIC_ASOL_NATIVE_VERSION?.trim() || '1.0.0';
  console.log(`minimumNativeVersion: ${resolved}${declared ? ' (declared)' : ' (inherited)'}\n`);
  return resolved;
}

async function main(): Promise<void> {
  loadOtaEnvironment();

  const minimumNativeVersion = assertNativeCompatibility();

  // `--dry-run` verifies the compatibility gate without building or touching
  // R2. Use it to test the gate; a real run overwrites the live channel.
  if (process.argv.includes('--dry-run')) {
    console.log(
      `Dry run: the compatibility gate passed and would stamp ` +
        `minimumNativeVersion=${minimumNativeVersion}. Nothing was built or uploaded.`,
    );
    return;
  }

  const prefix = getOtaPrefix();
  const manifestKey = `${prefix}/manifest.json`;
  const filesPrefix = `${prefix}/files`;
  const client = createOtaR2Client();
  const previousManifest = await otaObjectExists(client, manifestKey)
    ? await getOtaManifestObject(client, manifestKey)
    : null;
  const packageVersion = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version;
  const version = previousManifest ? nextPatchVersion(previousManifest.version) : packageVersion;
  const now = new Date();
  const notes = automaticNotes(now);
  const privateKey = getOtaPrivateKey();
  const apiBaseUrl = (
    process.env.ASOL_CAPACITOR_API_BASE_URL ?? CAPACITOR_API_BASE_URL
  ).replace(/\/$/, '');
  const buildEnv: NodeJS.ProcessEnv = {
    ...withoutVsCodeDebuggerEnv(process.env),
    ...otaClientBuildEnv(version),
    NEXT_PUBLIC_ASOL_API_BASE_URL: apiBaseUrl,
  };

  console.log(`R2 current version: ${previousManifest?.version ?? 'none'}`);
  console.log(`Automatically selected version: ${version}`);
  console.log(`Release notes: ${notes}`);
  execSync('npm run build:static', { stdio: 'inherit', env: buildEnv });

  const files = collectFiles(path.resolve('out'));
  const baseUrl = `${getOtaPublicBaseUrl()}/${filesPrefix}`;
  const isSingleDirectoryLayout = previousManifest?.baseUrl.replace(/\/$/, '') === baseUrl;
  const changedPaths = Object.entries(files)
    .filter(([filePath, file]) => {
      const previous = previousManifest?.files[filePath];
      const requiresBinaryTransport = path.extname(filePath).toLowerCase() === '.json';
      return requiresBinaryTransport || !isSingleDirectoryLayout || previous?.sha256 !== file.sha256 || previous.size !== file.size;
    })
    .map(([filePath]) => filePath);

  const expectedKeys = new Set(Object.keys(files).map((filePath) => `${filesPrefix}/${filePath}`));
  const existingKeys = await listOtaObjectKeys(client, `${filesPrefix}/`);
  const deletedKeys = existingKeys.filter((key) => !expectedKeys.has(key));

  console.log(`R2 delta: ${changedPaths.length} changed/new, ${deletedKeys.length} deleted`);
  let uploaded = 0;
  for (const filePath of changedPaths) {
    const file = files[filePath]!;
    await putOtaObject(
      client,
      `${filesPrefix}/${filePath}`,
      file.bytes,
      contentTypeFor(filePath),
      'public, max-age=0, must-revalidate',
    );
    uploaded += 1;
    if (uploaded === 1 || uploaded % 100 === 0 || uploaded === changedPaths.length) {
      console.log(`  uploaded ${uploaded}/${changedPaths.length}: ${filePath}`);
    }
  }
  await deleteOtaObjects(client, deletedKeys);

  const size = Object.values(files).reduce((total, file) => total + file.size, 0);
  const payload: OtaManifestPayload = {
    schemaVersion: OTA_SCHEMA_VERSION,
    delivery: 'files',
    releaseId: `${version}-${now.getTime()}`,
    version,
    createdAt: now.toISOString(),
    baseUrl,
    size,
    fileCount: Object.keys(files).length,
    minimumNativeVersion,
    mandatory: false,
    notes,
    files: Object.fromEntries(
      Object.entries(files).map(([filePath, file]) => [filePath, { sha256: file.sha256, size: file.size }]),
    ),
  };
  const signature = sign('sha256', Buffer.from(canonicalManifestPayload(payload)), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  }).toString('base64');
  const manifest: OtaManifest = { ...payload, signature };

  await putOtaObject(
    client,
    manifestKey,
    JSON.stringify(manifest, null, 2),
    'application/json',
    'no-store, max-age=0',
  );

  const legacyKeys = await listOtaObjectKeys(client, `${prefix}/releases/`);
  await deleteOtaObjects(client, legacyKeys);
  console.log(`Removed ${legacyKeys.length} legacy release objects`);
  console.log(`OTA ${version} published to the single current directory`);
  console.log(`Manifest: ${getOtaManifestUrl()}`);
  console.log(`Files: ${payload.fileCount}, total bytes: ${size}`);
}

main().catch((error) => {
  console.error(`OTA publish failed: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
