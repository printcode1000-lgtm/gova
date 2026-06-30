import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { CAPACITOR_API_BASE_URL } from '../platform/capacitor.defaults';
import {
  getOtaPrefix,
  loadOtaEnvironment,
  otaClientBuildEnv,
  type OtaManifest,
} from './ota/ota-config';
import {
  createOtaR2Client,
  getOtaManifestObject,
  getOtaObjectBytes,
  listOtaObjectKeys,
} from './ota/ota-r2';

const LOCAL_MANIFEST_PATH = path.resolve('out', 'gova-web-manifest.json');
const ANDROID_BUILD_GRADLE = path.resolve('android', 'app', 'build.gradle');
const IOS_PROJECT_FILE = path.resolve('ios', 'App', 'App.xcodeproj', 'project.pbxproj');

function versionCode(version: string): number {
  const [major = 0, minor = 0, patch = 0] = version.split('.').map((part) => Number(part) || 0);
  return major * 10000 + minor * 100 + patch;
}

function updateAndroidVersion(version: string): void {
  if (!existsSync(ANDROID_BUILD_GRADLE)) {
    throw new Error(`Android build file not found: ${ANDROID_BUILD_GRADLE}`);
  }
  const code = versionCode(version);
  const before = readFileSync(ANDROID_BUILD_GRADLE, 'utf8');
  const after = before
    .replace(/versionCode\s+\d+/, `versionCode ${code}`)
    .replace(/versionName\s+"[^"]+"/, `versionName "${version}"`);
  if (before !== after) writeFileSync(ANDROID_BUILD_GRADLE, after);
  console.log(`Android versionName=${version}, versionCode=${code}`);
}

function updateIosVersion(version: string): void {
  if (!existsSync(IOS_PROJECT_FILE)) {
    throw new Error(`iOS project file not found: ${IOS_PROJECT_FILE}`);
  }
  const buildNumber = versionCode(version);
  const before = readFileSync(IOS_PROJECT_FILE, 'utf8');
  const after = before
    .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${buildNumber};`)
    .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`);
  if (before !== after) writeFileSync(IOS_PROJECT_FILE, after);
  console.log(`iOS MARKETING_VERSION=${version}, CURRENT_PROJECT_VERSION=${buildNumber}`);
}

function readLocalManifest(): OtaManifest {
  if (!existsSync(LOCAL_MANIFEST_PATH)) {
    throw new Error(`Local web manifest not found after OTA publish: ${LOCAL_MANIFEST_PATH}`);
  }
  return JSON.parse(readFileSync(LOCAL_MANIFEST_PATH, 'utf8')) as OtaManifest;
}

function compareManifestFiles(local: OtaManifest, remote: OtaManifest): string[] {
  const errors: string[] = [];
  if (local.schemaVersion !== remote.schemaVersion) errors.push(`schemaVersion ${local.schemaVersion} != ${remote.schemaVersion}`);
  if (local.delivery !== remote.delivery) errors.push(`delivery ${local.delivery} != ${remote.delivery}`);
  if (local.version !== remote.version) errors.push(`version ${local.version} != ${remote.version}`);
  if (local.fileCount !== remote.fileCount) errors.push(`fileCount ${local.fileCount} != ${remote.fileCount}`);
  if (local.size !== remote.size) errors.push(`size ${local.size} != ${remote.size}`);

  for (const [filePath, remoteFile] of Object.entries(remote.files)) {
    const localFile = local.files[filePath];
    if (!localFile) errors.push(`missing local file: ${filePath}`);
    else if (localFile.sha256 !== remoteFile.sha256 || localFile.size !== remoteFile.size) {
      errors.push(`local mismatch: ${filePath}`);
    }
  }
  for (const filePath of Object.keys(local.files)) {
    if (!(filePath in remote.files)) errors.push(`extra local file: ${filePath}`);
  }
  return errors;
}

async function mapConcurrent<T>(items: T[], limit: number, action: (item: T) => Promise<void>): Promise<void> {
  let nextIndex = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex++]!;
      await action(item);
    }
  }));
}

async function verifyR2Files(manifest: OtaManifest): Promise<void> {
  const client = createOtaR2Client();
  const prefix = `${getOtaPrefix()}/files/`;
  const actualKeys = (await listOtaObjectKeys(client, prefix)).sort();
  const expectedKeys = Object.keys(manifest.files).map((filePath) => `${prefix}${filePath}`).sort();
  if (actualKeys.length !== expectedKeys.length || actualKeys.some((key, index) => key !== expectedKeys[index])) {
    throw new Error(`R2 file keys do not match manifest: actual=${actualKeys.length}, expected=${expectedKeys.length}`);
  }

  let verified = 0;
  await mapConcurrent(Object.entries(manifest.files), 10, async ([filePath, expected]) => {
    const bytes = await getOtaObjectBytes(client, `${prefix}${filePath}`);
    const hash = createHash('sha256').update(bytes).digest('hex');
    if (bytes.byteLength !== expected.size || hash !== expected.sha256) {
      throw new Error(`R2 object content mismatch: ${filePath}`);
    }
    verified += 1;
    if (verified === 1 || verified % 100 === 0 || verified === manifest.fileCount) {
      console.log(`  verified ${verified}/${manifest.fileCount} R2 files`);
    }
  });
}

async function main(): Promise<void> {
  loadOtaEnvironment();
  const apiBaseUrl = (
    process.env.GOVA_CAPACITOR_API_BASE_URL ?? CAPACITOR_API_BASE_URL
  ).replace(/\/$/, '');
  const publishEnv: NodeJS.ProcessEnv = {
    ...process.env,
    GOVA_CAPACITOR_API_BASE_URL: apiBaseUrl,
  };

  console.log('Publishing the next automatic OTA version to the single R2 directory...');
  execSync('npm run ota:publish', { stdio: 'inherit', env: publishEnv });

  const client = createOtaR2Client();
  const remoteManifest = await getOtaManifestObject(client, `${getOtaPrefix()}/manifest.json`);
  const localManifest = readLocalManifest();
  const version = remoteManifest.version;
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ...otaClientBuildEnv(version),
    NEXT_PUBLIC_GOVA_API_BASE_URL: apiBaseUrl,
  };

  updateAndroidVersion(version);
  updateIosVersion(version);

  const errors = compareManifestFiles(localManifest, remoteManifest);
  if (errors.length > 0) {
    throw new Error(`Local output does not match R2 manifest (${errors.length}):\n${errors.slice(0, 20).join('\n')}`);
  }

  console.log('Verifying every R2 file by size and SHA-256...');
  await verifyR2Files(remoteManifest);
  execSync('npx cap sync', { stdio: 'inherit', env });

  console.log(`cap-build completed: R2, Android, and iOS are exactly version ${version}`);
  console.log(`Automatic notes: ${remoteManifest.notes}`);
}

main().catch((error) => {
  console.error(`cap-build failed: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
