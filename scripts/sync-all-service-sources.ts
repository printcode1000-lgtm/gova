import { execFileSync } from 'node:child_process';
import { RELEASE_WORKLOADS } from '@asol/vercel-deploy-core';

console.log('🔄 Synchronizing generated service mirrors...');

const scripts = ['scripts/sync-control-service-sources.ts', ...RELEASE_WORKLOADS.map((service) => 'scripts/sync-service-sources.ts')];

for (const [index, script] of scripts.entries()) {
  console.log(`Running ${script}...`);
  const args = ['tsx', script];
  if (index > 0) args.push(RELEASE_WORKLOADS[index - 1]!);
  execFileSync('npx', args, { stdio: 'inherit', shell: process.platform === 'win32' });
}

console.log('✅ All service mirrors synchronized successfully.');
