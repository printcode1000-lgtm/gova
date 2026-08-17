import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as runtimeApi from '../index';
import {
  CATALOG_V3_SCHEMA_VERSION,
  catalogDisplaySchema,
  isCatalogItemVisible,
  visibleCatalogItems,
} from '../index';
import * as serverApi from '../server';
import { resolveCatalogRoots, validateCatalogV3 } from '../server';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

export function runConstantsTest() {
  assert.equal(CATALOG_V3_SCHEMA_VERSION, 3);
  console.log('✅ catalog-core constants test passed');
}

export function runDisplayTest() {
  const visible = { display: { order: 1, hidden: false } };
  const hidden = { display: { order: 2, hidden: true } };
  assert.equal(isCatalogItemVisible(visible), true);
  assert.equal(isCatalogItemVisible(hidden), false);
  assert.equal(isCatalogItemVisible(visible, hidden), false);
  const sorted = visibleCatalogItems(
    [
      { id: 'b', display: { order: 2, hidden: false } },
      { id: 'a', display: { order: 1, hidden: false } },
      { id: 'c', display: { order: 3, hidden: true } },
    ],
    (item) => item.id,
  );
  assert.deepEqual(
    sorted.map((item) => item.id),
    ['a', 'b'],
  );
  console.log('✅ catalog-core display test passed');
}

export function runContractTest() {
  catalogDisplaySchema.parse({ order: 1, hidden: false });
  assert.throws(() => catalogDisplaySchema.parse({ order: 0, hidden: false }));
  console.log('✅ catalog-core contract test passed');
}

export function runValidationIntegrationTest() {
  const { publicRoot, catalogRoot } = resolveCatalogRoots(workspaceRoot);
  const result = validateCatalogV3({ catalogRoot, publicRoot });
  if (result.errors.length) {
    throw new Error(`Catalog validation failed in test:\n${result.errors.join('\n')}`);
  }
  assert.ok(result.summary);
  assert.equal(result.summary?.schemaVersion, 3);
  console.log('✅ catalog-core validation integration test passed');
}

export function runPublicSurfaceTest() {
  assert.equal(typeof runtimeApi.visibleCatalogItems, 'function');
  assert.equal(typeof runtimeApi.catalogManifestSchema, 'object');
  assert.equal(typeof serverApi.validateCatalogV3, 'function');
  assert.equal(typeof serverApi.resolveCatalogRoots, 'function');
  assert.equal('validateCatalogV3' in runtimeApi, false);
  console.log('✅ catalog-core public surface test passed');
}

async function main() {
  console.log('🚀 Running @asol/catalog-core test suite...\n');
  runConstantsTest();
  runDisplayTest();
  runContractTest();
  runValidationIntegrationTest();
  runPublicSurfaceTest();
  console.log('\n🎉 All @asol/catalog-core tests passed successfully!');
}

main().catch((error) => {
  console.error('\n❌ @asol/catalog-core test suite failed:', error);
  process.exit(1);
});
