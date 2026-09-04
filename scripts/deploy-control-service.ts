import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import dotenv from 'dotenv';
import { CONTROL_DECLARATION, deployAccountService } from '@asol/vercel-deploy-core';
import { assertReleaseDeploymentContext } from './assert-release-deployment-context';

if (existsSync('.env.local')) dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });

/**
 * Deploys the control runtime.
 *
 * Control is not one of the six workloads and is deliberately not in their
 * arrays: it holds deployment authority over them, so a command that deploys
 * "all services" must not be able to redeploy the runtime performing the deploy.
 */
function syncSharedSources(): void {
  execFileSync('npx', ['tsx', 'scripts/sync-control-service-sources.ts'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    cwd: process.cwd(),
  });
}

assertReleaseDeploymentContext('control:deploy');

deployAccountService({
  declaration: CONTROL_DECLARATION,
  syncSources: syncSharedSources,
}).catch((error) => {
  console.error('Control service deploy failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
