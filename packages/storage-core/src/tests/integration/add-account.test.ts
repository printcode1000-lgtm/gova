import assert from 'node:assert/strict';
import {
  registerStorageAccount,
  unregisterStorageAccount,
  getStorageAccount,
} from '../../domain/accounts/account-registry';
import { getAccountS3Credentials } from '../../server/config/account-credentials';
import { R2AccountProvider } from '../../server/providers/r2-account.provider';
import { resolveStorageProvider } from '../../server/providers/provider-resolver';

export function runAddAccountTest() {
  // 1. Register synthetic account
  const syntheticAccount = {
    id: 'synthetic-analytics',
    accountId: 'synthetic-acc-12345',
    endpoint: 'https://synthetic-acc-12345.r2.cloudflarestorage.com',
    bucketName: 'analytics-bucket',
    publicUrl: 'https://pub-synthetic.r2.dev',
    location: 'WEUR',
    jurisdiction: 'default' as const,
    envPrefix: 'SYNTHETIC_ANALYTICS_R2',
  };

  registerStorageAccount(syntheticAccount);

  try {
    // Assert registry lookup works
    const retrieved = getStorageAccount('synthetic-analytics');
    assert.equal(retrieved.bucketName, 'analytics-bucket');

    // Assert environment credential resolution works dynamically via envPrefix
    process.env.SYNTHETIC_ANALYTICS_R2_ACCESS_KEY_ID = 'test-access-key';
    process.env.SYNTHETIC_ANALYTICS_R2_SECRET_ACCESS_KEY = 'test-secret-key';
    process.env.SYNTHETIC_ANALYTICS_R2_ENDPOINT = syntheticAccount.endpoint;
    process.env.SYNTHETIC_ANALYTICS_R2_BUCKET_NAME = syntheticAccount.bucketName;
    process.env.SYNTHETIC_ANALYTICS_R2_PUBLIC_URL = syntheticAccount.publicUrl;

    const creds = getAccountS3Credentials('synthetic-analytics');
    assert.equal(creds.accessKeyId, 'test-access-key');
    assert.equal(creds.bucketName, 'analytics-bucket');

    // Assert provider construction works without any new provider class
    const provider = new R2AccountProvider('synthetic-analytics');
    assert.equal(provider.providerId, 'CloudflareR2_synthetic-analytics');
    assert.equal(provider.resolvePublicUrl('images/test.webp'), 'https://pub-synthetic.r2.dev/images/test.webp');

    // Assert profile resolution works dynamically for CloudflareR2_synthetic-analytics
    const resolvedProvider = resolveStorageProvider('CloudflareR2_synthetic-analytics' as any);
    assert.ok(resolvedProvider instanceof R2AccountProvider);
    assert.equal((resolvedProvider as R2AccountProvider).accountId, 'synthetic-analytics');

    console.log('✅ Integration test: add-account passed (extensibility proven)');
  } finally {
    // Clean up env and registry
    delete process.env.SYNTHETIC_ANALYTICS_R2_ACCESS_KEY_ID;
    delete process.env.SYNTHETIC_ANALYTICS_R2_SECRET_ACCESS_KEY;
    delete process.env.SYNTHETIC_ANALYTICS_R2_ENDPOINT;
    delete process.env.SYNTHETIC_ANALYTICS_R2_BUCKET_NAME;
    delete process.env.SYNTHETIC_ANALYTICS_R2_PUBLIC_URL;
    unregisterStorageAccount('synthetic-analytics');
  }
}
