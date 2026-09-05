import { runAccountRegistryUnitTest } from './unit/account-registry.test';
import { runAccountCredentialsTest } from './unit/account-credentials.test';
import { runStorageProfileValidatorTest } from './unit/storage-profile-validator.test';
import { runImageRulesTest } from './unit/image-rules.test';
import { runImageKeyGeneratorTest } from './unit/image-key-generator.test';
import { runImagePathTest } from './unit/image-path.test';
import { runOutputFormatTest } from './unit/output-format.test';
import { runProductCategoryStorageRoutingTest } from './unit/product-category-storage-routing.test';
import { runAddAccountTest } from './integration/add-account.test';
import { runSplitAccountTest } from './integration/split-account.test';
import { runParameterizedStoreTest } from './integration/parameterized-store.test';
import { runCredentialIsolationTest } from './integration/credential-isolation.test';
import { runRuntimePurityTest } from './contract/runtime-purity.test';
import { runPackageIndependenceTest } from './contract/package-independence.test';
import { runNoPairedFunctionsTest } from './contract/no-paired-functions.test';
import { runPublicSurfaceTest } from './contract/public-surface.test';
import { runR2AccountSeparationTest } from './r2-account-separation.test';

async function main() {
  console.log('🚀 Running @asol/storage-core test suite...\n');

  runAccountRegistryUnitTest();
  runAccountCredentialsTest();
  runStorageProfileValidatorTest();
  runImageRulesTest();
  runImageKeyGeneratorTest();
  runImagePathTest();
  runOutputFormatTest();
  runProductCategoryStorageRoutingTest();
  runAddAccountTest();
  runSplitAccountTest();
  await runParameterizedStoreTest();
  runCredentialIsolationTest();
  runRuntimePurityTest();
  runPackageIndependenceTest();
  runNoPairedFunctionsTest();
  runPublicSurfaceTest();
  await runR2AccountSeparationTest();

  console.log('\n🎉 All @asol/storage-core tests passed successfully!');
}

main().catch((error) => {
  console.error('\n❌ @asol/storage-core test suite failed:', error);
  process.exit(1);
});
