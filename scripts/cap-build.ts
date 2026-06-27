import { execSync } from 'node:child_process';
import { CAPACITOR_API_BASE_URL } from '../platform/capacitor.defaults';

const apiBaseUrl = (
  process.env.GOVA_CAPACITOR_API_BASE_URL ?? CAPACITOR_API_BASE_URL
).replace(/\/$/, '');

console.log(`📱 Capacitor build → API base: ${apiBaseUrl}`);

const env: NodeJS.ProcessEnv = {
  ...process.env,
  NEXT_PUBLIC_GOVA_API_BASE_URL: apiBaseUrl,
};

execSync('npm run build:static', { stdio: 'inherit', env });
execSync('npx cap sync', { stdio: 'inherit', env });
