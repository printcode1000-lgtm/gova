import assert from 'node:assert/strict';
import {
  getStorageAccount,
  getStorageAccountIds,
  registerStorageAccount,
  unregisterStorageAccount,
  assertStorageAccountTargetFields,
} from '../../domain/accounts/account-registry';

export function runAccountRegistryUnitTest() {
  const ids = getStorageAccountIds();
  assert.ok(ids.includes('general'));
  assert.ok(ids.includes('products'));

  const general = getStorageAccount('general');
  const products = getStorageAccount('products');

  assert.notEqual(general.accountId, products.accountId);
  assert.notEqual(general.endpoint, products.endpoint);
  assert.notEqual(general.bucketName, products.bucketName);
  assert.notEqual(general.publicUrl, products.publicUrl);

  assert.throws(
    () => getStorageAccount('non-existent-account'),
    /Unknown storage account id: "non-existent-account"/,
  );

  console.log('✅ Unit test: account registry passed');
}
