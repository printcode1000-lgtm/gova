import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { CAPACITOR_API_BASE_URL } from '../platform/capacitor.defaults';
import { withoutVsCodeDebuggerEnv } from './child-process-env';
import { loadOtaEnvironment, otaClientBuildEnv } from './ota/ota-config';

const ANDROID_BUILD_GRADLE = path.resolve('android', 'app', 'build.gradle');

function readCurrentNativeVersion(): string {
  const gradle = readFileSync(ANDROID_BUILD_GRADLE, 'utf8');
  const match = gradle.match(/versionName\s+"([^"]+)"/);

  if (!match?.[1]) {
    throw new Error(`Unable to read versionName from ${ANDROID_BUILD_GRADLE}`);
  }

  return match[1];
}

function main(): void {
  loadOtaEnvironment();
  const version = readCurrentNativeVersion();
  const apiBaseUrl = (
    process.env.ASOL_CAPACITOR_API_BASE_URL ?? CAPACITOR_API_BASE_URL
  ).replace(/\/$/, '');
  const env: NodeJS.ProcessEnv = {
    ...withoutVsCodeDebuggerEnv(process.env),
    ...otaClientBuildEnv(version),
    ASOL_CAPACITOR_API_BASE_URL: apiBaseUrl,
    NEXT_PUBLIC_ASOL_API_BASE_URL: apiBaseUrl,
  };

  console.log(`Building local Capacitor assets with existing version ${version}...`);
  console.log('R2 publishing, native version updates, and icon generation are disabled.');

  execSync('npx tsx scripts/build-static.ts', { stdio: 'inherit', env });
  execSync('npx cap sync', { stdio: 'inherit', env });

  console.log(`Local Capacitor build completed at version ${version}. Nothing was published to R2.`);
}

try {
  main();
} catch (error) {
  console.error(`Local cap-build failed: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
}
