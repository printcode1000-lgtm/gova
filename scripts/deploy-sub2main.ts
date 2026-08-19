import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import dotenv from 'dotenv';
import { deployAccountService, SUB2MAIN_DECLARATION } from '@asol/vercel-deploy-core';

if (existsSync('.env.local')) dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });

function syncSharedSources(): void {
  execFileSync('npx', ['tsx', 'scripts/sync-sub2main-service-sources.ts'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    cwd: process.cwd(),
  });
}

deployAccountService({
  declaration: SUB2MAIN_DECLARATION,
  syncSources: syncSharedSources,
}).catch((error) => {
  console.error('Sub2main service deploy failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
