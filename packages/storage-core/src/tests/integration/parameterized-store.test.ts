import assert from 'node:assert/strict';
import { resolveStorageProvider } from '../../server/providers/provider-resolver';
import { R2AccountProvider } from '../../server/providers/r2-account.provider';
import { LocalStorageProvider } from '../../server/providers/local-storage.provider';

export async function runParameterizedStoreTest() {
  const originalEnv = { ...process.env };
  try {
    process.env.NODE_ENV = 'development';
    delete process.env.ASOL_PROVISIONING;

    // 1. Fallback to LocalStorageProvider in development runtime
    const generalProvider = resolveStorageProvider('CloudflareR2');
    assert.ok(generalProvider instanceof LocalStorageProvider);

    const productsProvider = resolveStorageProvider('CloudflareR2Products');
    assert.ok(productsProvider instanceof LocalStorageProvider);

    // 2. Direct creation of R2AccountProvider per account
    const r2General = new R2AccountProvider('general');
    assert.equal(r2General.accountId, 'general');

    const r2Products = new R2AccountProvider('products');
    assert.equal(r2Products.accountId, 'products');

    // 3. Perform parameterized operations on LocalStorageProvider
    const testKeyGen = 'images/profile/test-integration-gen.webp';
    const testBuffer = Buffer.from('fake-image-general-content');

    const uploadRes = await generalProvider.upload(testKeyGen, testBuffer, 'image/webp');
    assert.ok(uploadRes.url);
    assert.ok(await generalProvider.exists(testKeyGen));

    const publicUrl = generalProvider.resolvePublicUrl(testKeyGen);
    assert.ok(publicUrl.includes(testKeyGen));

    const listGen = await generalProvider.list('images/profile');
    assert.ok(listGen.some((item) => item.path.includes('test-integration-gen.webp')));

    await generalProvider.delete(testKeyGen);
    assert.ok(!(await generalProvider.exists(testKeyGen)));

    console.log('✅ Integration test: parameterized store passed');
  } finally {
    process.env = originalEnv;
  }
}
