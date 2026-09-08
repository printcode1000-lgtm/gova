import assert from 'node:assert/strict';
import {
  ACCOUNT_DELETION_IMAGE_SOURCES,
  ACCOUNT_DELETION_REGISTRY_VERSION,
} from '../account-deletion-registry.persistence';
import { evaluateRegistryCoverage } from '../account-deletion-registry.coverage';

function runRegistryVersionTest() {
  assert.equal(typeof ACCOUNT_DELETION_REGISTRY_VERSION, 'number');
  assert.ok(ACCOUNT_DELETION_REGISTRY_VERSION >= 1);
  console.log('✅ account deletion registry version test passed');
}

/**
 * Coverage is measured against the desired-schema manifests — the schema the
 * databases are meant to have now — not against concatenated migration history,
 * which still contains tables that were later dropped or renamed.
 */
function runRegistryCoverageContractTest() {
  const { missing } = evaluateRegistryCoverage();

  if (missing.length > 0) {
    const details = missing
      .map((entry) => `  - ${entry.database}.${entry.table}`)
      .join('\n');
    assert.fail(
      `Account deletion registry is missing ${missing.length} user-owned table(s):\n${details}\nUpdate packages/auth-core/src/domain/account-deletion-registry.ts`,
    );
  }

  console.log('✅ account deletion registry coverage contract passed');
}

function runImageSourceContractTest() {
  assert.deepEqual(
    ACCOUNT_DELETION_IMAGE_SOURCES.map((source) => source.id),
    [
      'profile_images',
      'product_images_json',
      'pharmacy_override_images',
      'custom_request_images',
    ],
    'Image cleanup sources must match the live image tables and JSON fields.',
  );
  console.log('✅ account deletion image source contract passed');
}

function main() {
  console.log('🚀 Running account deletion registry contract...\n');
  runRegistryVersionTest();
  runRegistryCoverageContractTest();
  runImageSourceContractTest();
  console.log('\n🎉 Account deletion registry contract passed successfully!');
}

main();
