import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { CAPACITOR_API_BASE_URL } from '../platform/capacitor.defaults';
import {
  getOtaPrefix,
  loadOtaEnvironment,
  otaClientBuildEnv,
  type OtaManifest,
} from './ota/ota-config';
import { createOtaR2Client, getOtaManifestObject } from './ota/ota-r2';

const LOCAL_MANIFEST_PATH = path.resolve('out', 'gova-web-manifest.json');
const ANDROID_BUILD_GRADLE = path.resolve('android', 'app', 'build.gradle');
const IOS_PROJECT_FILE = path.resolve('ios', 'App', 'App.xcodeproj', 'project.pbxproj');

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function packageVersion(): string {
  return (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version;
}

function assertVersion(version: string): void {
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error(`Invalid version "${version}". Expected semver like 0.1.3`);
  }
}

function versionCode(version: string): number {
  const [major = 0, minor = 0, patch = 0] = version
    .split('-')[0]!
    .split('.')
    .map((part) => Number(part) || 0);
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
    throw new Error(`Local web manifest not found after build: ${LOCAL_MANIFEST_PATH}`);
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

  const localPaths = new Set(Object.keys(local.files));
  const remotePaths = new Set(Object.keys(remote.files));

  for (const filePath of remotePaths) {
    const localFile = local.files[filePath];
    const remoteFile = remote.files[filePath];
    if (!localFile) {
      errors.push(`missing local file: ${filePath}`);
      continue;
    }
    if (localFile.sha256 !== remoteFile?.sha256) errors.push(`hash mismatch: ${filePath}`);
    if (localFile.size !== remoteFile?.size) errors.push(`size mismatch: ${filePath}`);
  }

  for (const filePath of localPaths) {
    if (!remotePaths.has(filePath)) errors.push(`extra local file: ${filePath}`);
  }

  return errors;
}

async function verifyAgainstR2(version: string): Promise<void> {
  console.log('Verifying local web manifest against R2 channel manifest...');
  const localManifest = readLocalManifest();
  const remoteManifest = await getOtaManifestObject(createOtaR2Client(), `${getOtaPrefix()}/manifest.json`);

  if (localManifest.version !== version) {
    throw new Error(`Local manifest version ${localManifest.version} does not match cap-build version ${version}`);
  }
  if (remoteManifest.version !== version) {
    throw new Error(`R2 version ${remoteManifest.version} does not match cap-build version ${version}`);
  }

  const errors = compareManifestFiles(localManifest, remoteManifest);
  if (errors.length > 0) {
    const preview = errors.slice(0, 20).map((error) => `- ${error}`).join('\n');
    throw new Error(`Local files do not match R2 manifest (${errors.length} differences):\n${preview}`);
  }

  console.log(`R2 manifest matches local files exactly: version=${version}, files=${localManifest.fileCount}`);
}

async function main(): Promise<void> {
  loadOtaEnvironment();

  const version = argument('version') ?? process.env.GOVA_WEB_BUNDLE_VERSION ?? packageVersion();
  assertVersion(version);

  const apiBaseUrl = (
    process.env.GOVA_CAPACITOR_API_BASE_URL ?? CAPACITOR_API_BASE_URL
  ).replace(/\/$/, '');

  console.log(`Capacitor build version: ${version}`);
  console.log(`Capacitor API base: ${apiBaseUrl}`);

  updateAndroidVersion(version);
  updateIosVersion(version);

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ...otaClientBuildEnv(version),
    NEXT_PUBLIC_GOVA_API_BASE_URL: apiBaseUrl,
    NEXT_PUBLIC_GOVA_NATIVE_VERSION: version,
  };

  execSync('npm run build:static', { stdio: 'inherit', env });
  await verifyAgainstR2(version);
  execSync('npx cap sync', { stdio: 'inherit', env });

  console.log(`cap-build completed with Android/iOS/R2 all pinned to ${version}`);
}

main().catch((error) => {
  console.error(`cap-build failed: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
