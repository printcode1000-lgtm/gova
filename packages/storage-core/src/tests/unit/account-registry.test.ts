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
  assert.ok(ids.includes('products-apparel-pets'));

  const general = getStorageAccount('general');
  const products = getStorageAccount('products');
  const apparelPets = getStorageAccount('products-apparel-pets');

  assert.notEqual(general.accountId, products.accountId);
  assert.notEqual(general.endpoint, products.endpoint);
  assert.notEqual(general.bucketName, products.bucketName);
  assert.notEqual(general.publicUrl, products.publicUrl);
  assert.notEqual(products.accountId, apparelPets.accountId);
  assert.notEqual(products.bucketName, apparelPets.bucketName);
  assert.equal(apparelPets.envPrefix, 'APPAREL_PETS_R2');
  assert.equal(apparelPets.bucketName, 'productcat1');

  assert.throws(
    () => getStorageAccount('non-existent-account'),
    /Unknown storage account id: "non-existent-account"/,
  );

  console.log('✅ Unit test: account registry passed');
}
