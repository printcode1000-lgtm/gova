import assert from 'node:assert/strict';
import {
  getStorageAccount,
  assertStorageAccountTargetFields,
} from '../../domain/accounts/account-registry';

export function runSplitAccountTest() {
  const general = getStorageAccount('general');
  const products = getStorageAccount('products');

  // Verify accounts are distinct and target fields assert properly
  assertStorageAccountTargetFields('general', general);
  assertStorageAccountTargetFields('products', products);

  // Cross account target assertion throws
  assert.throws(
    () => assertStorageAccountTargetFields('general', products),
    /r2StorageTargetMismatch:general/,
  );

  console.log('✅ Integration test: split-account passed');
}
