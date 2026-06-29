import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { CAPACITOR_API_BASE_URL } from '../platform/capacitor.defaults';
import { loadOtaEnvironment, otaClientBuildEnv } from './ota/ota-config';

loadOtaEnvironment();

const packageVersion = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version;

const apiBaseUrl = (
  process.env.GOVA_CAPACITOR_API_BASE_URL ?? CAPACITOR_API_BASE_URL
).replace(/\/$/, '');

console.log(`📱 Capacitor build → API base: ${apiBaseUrl}`);

const env: NodeJS.ProcessEnv = {
  ...process.env,
  ...otaClientBuildEnv(process.env.GOVA_WEB_BUNDLE_VERSION ?? packageVersion),
  NEXT_PUBLIC_GOVA_API_BASE_URL: apiBaseUrl,
  NEXT_PUBLIC_GOVA_NATIVE_VERSION: process.env.GOVA_NATIVE_VERSION ?? '1.0.0',
};

execSync('npm run build:static', { stdio: 'inherit', env });
execSync('npx cap sync', { stdio: 'inherit', env });
