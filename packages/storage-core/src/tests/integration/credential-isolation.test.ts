import assert from 'node:assert/strict';
import { getAccountS3Credentials } from '../../server/config/account-credentials';

export function runCredentialIsolationTest() {
  const originalEnv = { ...process.env };
  try {
    // Setup environment where PRODUCTS is configured for R2, but GENERAL is missing R2_BUCKET_NAME
    process.env.R2_ACCESS_KEY_ID = 'gen-key';
    process.env.R2_SECRET_ACCESS_KEY = 'gen-secret';
    process.env.R2_ENDPOINT = 'https://8486fdbb1c87dc78481f2def0a23e043.r2.cloudflarestorage.com';
    delete process.env.R2_BUCKET_NAME; // Intentionally missing!

    process.env.PRODUCT_R2_ACCESS_KEY_ID = 'prod-key';
    process.env.PRODUCT_R2_SECRET_ACCESS_KEY = 'prod-secret';
    process.env.PRODUCT_R2_ENDPOINT = 'https://166409f3b449d8f1da0dee6d25ed3e08.r2.cloudflarestorage.com';
    process.env.PRODUCT_R2_BUCKET_NAME = 'gova-storage';
    process.env.PRODUCT_R2_PUBLIC_URL = 'https://pub-e1fa9cec1a694b118840c7c2ebc1633b.r2.dev';

    // 1. Account B (Products) succeeds cleanly
    const prodCreds = getAccountS3Credentials('products');
    assert.equal(prodCreds.bucketName, 'gova-storage');

    // 2. Account A (General) fails loudly naming "general" in error message
    assert.throws(
      () => getAccountS3Credentials('general'),
      (err: any) => err instanceof Error && err.message.includes('general'),
      'Account A (general) must fail loudly with account name in error when env is missing',
    );

    console.log('✅ Integration test: credential isolation passed');
  } finally {
    process.env = originalEnv;
  }
}
