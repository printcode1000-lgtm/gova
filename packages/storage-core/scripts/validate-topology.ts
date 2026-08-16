import assert from 'node:assert/strict';
import {
  getStorageAccount,
  assertStorageAccountTargetFields,
} from '../src/domain/accounts/account-registry';

const general = getStorageAccount('general');
const products = getStorageAccount('products');

assert.doesNotThrow(() => {
  assertStorageAccountTargetFields('general', general);
  assertStorageAccountTargetFields('products', products);
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

console.log('R2 storage topology checks passed');
