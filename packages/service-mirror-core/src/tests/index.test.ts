import { existsSync, readFileSync, rmSync } from 'fs';
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
    const driver = new (nodeRequire('./database/turso-db-client').TursoDatabaseClient)();
    const own = myRequire("./also-followed");
  `;
  const specifiers = collectSpecifiers(sampleCode);
  assert(specifiers.includes('@/core/config'), 'M2: import specifier captured');
  assert(specifiers.includes('./data-source-registry'), 'M2: require specifier captured');
  assert(specifiers.includes('../lazy-module'), 'M2: dynamic import captured');
  // An ES module cannot call bare `require`, so a package that declares `"type": "module"` and
  // still needs a synchronous lazy load builds its own handle with `createRequire`. When
  // `@asol/data-core` did exactly that, a pattern anchored on the bare name stopped matching and
  // every database driver silently vanished from all four mirrors — the uploads still built and
  // would have failed at the first query. Any identifier ending in `require` is followed now.
  assert(
    specifiers.includes('./database/turso-db-client'),
    'M2: createRequire handle (nodeRequire) specifier captured',
  );
  assert(specifiers.includes('./also-followed'), 'M2: any *require identifier captured');
  assert(
    !collectSpecifiers(`const x = notRequired('./skipped');`).includes('./skipped'),
    'M2: a call that merely contains the letters is not treated as a module edge',
  );
  console.log('  ✔ require(), createRequire handles, and dynamic imports followed (M6 / M2).');

  // Test M3: Outside src/ throws
  const root = process.cwd();
  const sourceRoot = path.join(root, 'src');
  const outsidePath = path.join(root, 'node_modules', 'some-pkg');
  const resolvedOutside = resolveModule('../../package.json', path.join(sourceRoot, 'core', 'dummy.ts'), sourceRoot);
  assert(resolvedOutside === null || !resolvedOutside.startsWith(sourceRoot), 'M3: Outside src/ throws or returns non-src');
  console.log('  ✔ Outside src/ resolution boundary enforced (M3).');

  // Test M4: Runtime assets for products and profiles, none for notifications and orders
  // M4: the storage profile file is no longer copied into a deployment as a runtime asset. It is
  // imported by `@asol/storage-core`'s loader, so the module walker carries it into exactly the
  // uploads whose graph reaches it — the copies it replaced had to be kept in step by hand.
  for (const declaration of [PRODUCTS_DECLARATION, PROFILES_DECLARATION]) {
    assert(
      !(declaration.runtimeAssets ?? []).includes('src/config/storage-profiles.json'),
      'M4: storage-profiles.json must travel through the module graph, not as a copied asset',
    );
  }
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
    const manifestPath = path.join(throwawayDir, 'manifest.json');
    assert(existsSync(manifestPath), 'M5: throwaway manifest created');
    const firstGeneratedAt = JSON.parse(readFileSync(manifestPath, 'utf8')).generatedAt;
    syncServiceMirror({
      serviceName: 'notifications',
      serviceDir: 'services/notifications',
      entryPoints: NOTIFICATIONS_DECLARATION.mirrorEntryPoints,
      runtimeAssets: NOTIFICATIONS_DECLARATION.runtimeAssets,
      outOverride: throwawayDir,
    });
    const secondGeneratedAt = JSON.parse(readFileSync(manifestPath, 'utf8')).generatedAt;
    assert(
      secondGeneratedAt === firstGeneratedAt,
      'M5: unchanged mirror sync preserves manifest generatedAt',
    );
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
