import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import dotenv from 'dotenv';
import { deployAccountService, ORDERS_DECLARATION } from '@asol/vercel-deploy-core';

if (existsSync('.env.local')) dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });

function syncSharedSources(): void {
  execFileSync('npx', ['tsx', 'scripts/sync-orders-service-sources.ts'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    cwd: process.cwd(),
  });
}

deployAccountService({
  declaration: ORDERS_DECLARATION,
  syncSources: syncSharedSources,
}).catch((error) => {
  console.error('Orders service deploy failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
