import { execSync } from 'child_process';

console.log('🔄 Synchronizing generated service mirrors...');

const scripts = [
  'scripts/sync-notifications-service-sources.ts',
  'scripts/sync-products-service-sources.ts',
  'scripts/sync-orders-service-sources.ts',
  'scripts/sync-profiles-service-sources.ts',
  'scripts/sync-submain-service-sources.ts',
  'scripts/sync-sub2main-service-sources.ts',
];

for (const script of scripts) {
  console.log(`Running ${script}...`);
  execSync(`npx tsx ${script}`, { stdio: 'inherit' });
}

console.log('✅ All service mirrors synchronized successfully.');
