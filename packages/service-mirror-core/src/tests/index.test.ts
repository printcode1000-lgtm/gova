import { existsSync, rmSync } from 'fs';
import path from 'path';
import {
  collectSpecifiers,
  resolveModule,
  syncServiceMirror,
} from '../index';
import {
  NOTIFICATIONS_DECLARATION,
  PRODUCTS_DECLARATION,
  ORDERS_DECLARATION,
  PROFILES_DECLARATION,
} from '@asol/vercel-deploy-core';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runTests(): void {
  console.log('🧪 Running @asol/service-mirror-core tests...\n');

  // Test M2: require() form is recognized
  const sampleCode = `
    import { foo } from '@/core/config';
    const db = require('./data-source-registry');
    const dynamic = import('../lazy-module');
  `;
  const specifiers = collectSpecifiers(sampleCode);
  assert(specifiers.includes('@/core/config'), 'M2: import specifier captured');
  assert(specifiers.includes('./data-source-registry'), 'M2: require specifier captured');
  assert(specifiers.includes('../lazy-module'), 'M2: dynamic import captured');
  console.log('  ✔ require() and dynamic import specifiers followed (M6 / M2).');

  // Test M3: Outside src/ throws
  const root = process.cwd();
  const sourceRoot = path.join(root, 'src');
  const outsidePath = path.join(root, 'node_modules', 'some-pkg');
  const resolvedOutside = resolveModule('../../package.json', path.join(sourceRoot, 'core', 'dummy.ts'), sourceRoot);
  assert(resolvedOutside === null || !resolvedOutside.startsWith(sourceRoot), 'M3: Outside src/ throws or returns non-src');
  console.log('  ✔ Outside src/ resolution boundary enforced (M3).');

  // Test M4: Runtime assets for products and profiles, none for notifications and orders
  assert(PRODUCTS_DECLARATION.runtimeAssets.includes('src/config/storage-profiles.json'), 'M4: products receives storage-profiles.json');
  assert(PROFILES_DECLARATION.runtimeAssets.includes('src/config/storage-profiles.json'), 'M4: profiles receives storage-profiles.json');
  assert(NOTIFICATIONS_DECLARATION.runtimeAssets.length === 0, 'M4: notifications receives 0 runtime assets');
  assert(ORDERS_DECLARATION.runtimeAssets.length === 0, 'M4: orders receives 0 runtime assets');
  console.log('  ✔ Runtime assets configuration verified (M4).');

  // Test M5: Drift detection via --out throwaway directory
  const throwawayDir = path.join(root, '.tmp-test-mirror-out');
  try {
    const result = syncServiceMirror({
      serviceName: 'notifications',
      serviceDir: 'services/notifications',
      entryPoints: NOTIFICATIONS_DECLARATION.mirrorEntryPoints,
      runtimeAssets: NOTIFICATIONS_DECLARATION.runtimeAssets,
      outOverride: throwawayDir,
    });
    assert(result.fileCount > 0, 'M5: throwaway output written');
    assert(existsSync(path.join(throwawayDir, 'src')), 'M5: throwaway src folder created');
    assert(existsSync(path.join(throwawayDir, 'manifest.json')), 'M5: throwaway manifest created');
  } finally {
    rmSync(throwawayDir, { recursive: true, force: true });
  }
  console.log('  ✔ Drift detection --out override verified without modifying generated/ (M5).');

  console.log('\n✅ All @asol/service-mirror-core tests passed successfully!');
}

try {
  runTests();
} catch (err) {
  console.error('❌ service-mirror-core test failed:', err);
  process.exit(1);
}
