import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import dotenv from 'dotenv';
import { deployAccountService, PROFILES_DECLARATION } from '@asol/vercel-deploy-core';

if (existsSync('.env.local')) dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });

function syncSharedSources(): void {
  execFileSync('npx', ['tsx', 'scripts/sync-profiles-service-sources.ts'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    cwd: process.cwd(),
  });
}

deployAccountService({
  declaration: PROFILES_DECLARATION,
  syncSources: syncSharedSources,
}).catch((error) => {
  console.error('Profiles service deploy failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
