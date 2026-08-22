import assert from 'node:assert/strict';
import {
  getStorageAccount,
  assertStorageAccountTargetFields,
} from '../src/domain/accounts/account-registry';

const general = getStorageAccount('general');
const products = getStorageAccount('products');
const apparelPets = getStorageAccount('products-apparel-pets');

assert.doesNotThrow(() => {
  assertStorageAccountTargetFields('general', general);
  assertStorageAccountTargetFields('products', products);
  assertStorageAccountTargetFields('products-apparel-pets', apparelPets);
});

assert.throws(
  () => assertStorageAccountTargetFields('general', products),
  /r2StorageTargetMismatch:general:accountId,endpoint,bucketName,publicUrl/,
);

assert.throws(
  () =>
    assertStorageAccountTargetFields('general', {
      ...general,
      publicUrl: products.publicUrl,
    }),
  /r2StorageTargetMismatch:general:publicUrl/,
);

assert.throws(
  () => assertStorageAccountTargetFields('products', apparelPets),
  /r2StorageTargetMismatch:products:accountId,endpoint,bucketName,publicUrl/,
);

assert.throws(
  () =>
    assertStorageAccountTargetFields('products-apparel-pets', {
      ...apparelPets,
      bucketName: products.bucketName,
    }),
  /r2StorageTargetMismatch:products-apparel-pets:bucketName/,
);

assert.equal(apparelPets.envPrefix, 'APPAREL_PETS_R2');
assert.equal(apparelPets.bucketName, 'productcat1');
assert.equal(
  apparelPets.accountId,
  'f08cd5b705c3c57b1f65a220f7ef2642',
);

console.log('R2 storage topology checks passed');
