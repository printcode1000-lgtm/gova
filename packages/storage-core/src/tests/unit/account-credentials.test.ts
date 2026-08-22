import assert from 'node:assert/strict';
import {
  getAccountS3Credentials,
  getAccountCloudflareCredentials,
  getAccountConfig,
} from '../../server/config/account-credentials';

export function runAccountCredentialsTest() {
  const originalEnv = { ...process.env };

  try {
    // 1. Valid environment resolution
    process.env.R2_ACCESS_KEY_ID = 'test-general-access-key';
    process.env.R2_SECRET_ACCESS_KEY = 'test-general-secret-key';
    process.env.R2_ENDPOINT = 'https://8486fdbb1c87dc78481f2def0a23e043.r2.cloudflarestorage.com';
    process.env.R2_BUCKET_NAME = 'pic1';
    process.env.R2_PUBLIC_URL = 'https://pub-91c79e3f34ed4575b997fd68ac8dd278.r2.dev';
    process.env.R2_ACCOUNT_ID = '8486fdbb1c87dc78481f2def0a23e043';
    process.env.R2_API_TOKEN = 'test-general-token';

    process.env.PRODUCT_R2_ACCESS_KEY_ID = 'test-products-access-key';
    process.env.PRODUCT_R2_SECRET_ACCESS_KEY = 'test-products-secret-key';
    process.env.PRODUCT_R2_ENDPOINT = 'https://166409f3b449d8f1da0dee6d25ed3e08.r2.cloudflarestorage.com';
    process.env.PRODUCT_R2_BUCKET_NAME = 'gova-storage';
    process.env.PRODUCT_R2_PUBLIC_URL = 'https://pub-e1fa9cec1a694b118840c7c2ebc1633b.r2.dev';
    process.env.PRODUCT_R2_ACCOUNT_ID = '166409f3b449d8f1da0dee6d25ed3e08';
    process.env.PRODUCT_R2_API_TOKEN = 'test-products-token';

    process.env.APPAREL_PETS_R2_ACCESS_KEY_ID = 'test-apparel-access-key';
    process.env.APPAREL_PETS_R2_SECRET_ACCESS_KEY = 'test-apparel-secret-key';
    process.env.APPAREL_PETS_R2_ENDPOINT = 'https://f08cd5b705c3c57b1f65a220f7ef2642.r2.cloudflarestorage.com';
    process.env.APPAREL_PETS_R2_BUCKET_NAME = 'productcat1';
    process.env.APPAREL_PETS_R2_PUBLIC_URL = 'https://pub-de6cc53c347e4e6fa0dea7b79bd0ce3e.r2.dev';
    process.env.APPAREL_PETS_R2_ACCOUNT_ID = 'f08cd5b705c3c57b1f65a220f7ef2642';
    process.env.APPAREL_PETS_R2_API_TOKEN = 'test-apparel-token';

    const generalS3 = getAccountS3Credentials('general');
    assert.equal(generalS3.bucketName, 'pic1');

    const productsS3 = getAccountS3Credentials('products');
    assert.equal(productsS3.bucketName, 'gova-storage');

    const apparelS3 = getAccountS3Credentials('products-apparel-pets');
    assert.equal(apparelS3.bucketName, 'productcat1');

    const generalCf = getAccountCloudflareCredentials('general');
    assert.equal(generalCf.accountId, '8486fdbb1c87dc78481f2def0a23e043');

    const productsCf = getAccountCloudflareCredentials('products');
    assert.equal(productsCf.accountId, '166409f3b449d8f1da0dee6d25ed3e08');

    const apparelCf = getAccountCloudflareCredentials('products-apparel-pets');
    assert.equal(apparelCf.accountId, 'f08cd5b705c3c57b1f65a220f7ef2642');

    // 2. Loud failure naming missing account on missing env var
    delete process.env.R2_BUCKET_NAME;
    assert.throws(
      () => getAccountS3Credentials('general'),
      (err: any) => err instanceof Error && err.message.includes('general'),
      'Expected missing R2_BUCKET_NAME to throw an error naming account "general"',
    );

    delete process.env.PRODUCT_R2_BUCKET_NAME;
    assert.throws(
      () => getAccountS3Credentials('products'),
      (err: any) => err instanceof Error && err.message.includes('products'),
      'Expected missing PRODUCT_R2_BUCKET_NAME to throw an error naming account "products"',
    );

    delete process.env.APPAREL_PETS_R2_BUCKET_NAME;
    assert.throws(
      () => getAccountS3Credentials('products-apparel-pets'),
      (err: any) =>
        err instanceof Error && err.message.includes('products-apparel-pets'),
      'Expected missing APPAREL_PETS_R2_BUCKET_NAME to throw naming "products-apparel-pets"',
    );

    console.log('✅ Unit test: account credentials passed');
  } finally {
    process.env = originalEnv;
  }
}
