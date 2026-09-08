import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  resolveActiveProviderId,
  resolveStorageProvider,
} from '../../server/providers/provider-resolver';
import { R2AccountProvider } from '../../server/providers/r2-account.provider';
import storageProfiles from '../../config/storage-profiles.json';

/**
 * Profile resolution is the same in every runtime.
 *
 * Development used to be answered with a filesystem provider whatever the
 * profile said, so this test asserted that a `CloudflareR2` profile resolved to
 * `LocalStorageProvider` — it was pinning the divergence in place. What matters
 * now is that the profile decides, that each account stays its own account, and
 * that a non-R2 provider is refused rather than substituted.
 */
export async function runParameterizedStoreTest() {
  const originalEnv = { ...process.env };
  try {
    process.env.NODE_ENV = 'development';
    delete process.env.ASOL_PROVISIONING;

    // 1. Development resolves the profile's own R2 provider — no filesystem branch.
    const generalProvider = resolveStorageProvider('CloudflareR2');
    assert.ok(generalProvider instanceof R2AccountProvider);
    assert.equal(generalProvider.accountId, 'general');

    const productsProvider = resolveStorageProvider('CloudflareR2Products');
    assert.ok(productsProvider instanceof R2AccountProvider);
    assert.equal(productsProvider.accountId, 'products');

    // 2. A dynamically named account resolves to itself, never to another.
    const apparel = resolveStorageProvider('CloudflareR2_products-apparel-pets');
    assert.ok(apparel instanceof R2AccountProvider);
    assert.equal(apparel.accountId, 'products-apparel-pets');
    assert.notEqual(apparel, productsProvider);

    // 3. The active provider id is the profile's, in Development as anywhere else.
    assert.equal(resolveActiveProviderId('CloudflareR2'), 'CloudflareR2');
    assert.equal(
      resolveActiveProviderId('CloudflareR2_products-apparel-pets'),
      'CloudflareR2_products-apparel-pets',
    );

    // 4. There is no filesystem provider left to fall back to.
    assert.throws(
      () => resolveStorageProvider('GoogleDrive'),
      /Cloudflare R2/,
      'A non-R2 provider must be refused, not substituted.',
    );
    assert.throws(
      () => resolveStorageProvider('LocalStorage' as never),
      /Cloudflare R2/,
      'LocalStorage must not resolve to anything.',
    );

    // 5. Object prefixes are the live R2 ones. Collapsing `folder`/`cloudFolder`
    //    was a configuration simplification; changing a prefix would orphan every
    //    object already stored under the old one.
    const expectedFolders: Record<string, string> = {
      avatar: 'images/profile/avatars',
      cover: 'images/profile/covers',
      'home-hero-slider': 'images/content/advertisements/home-hero-slider',
      'product-default': 'images/products',
      'product-apparel-pets': 'images/products-apparel-pets',
      spicialOrder: 'images/content/spicialOrder',
    };
    for (const profile of storageProfiles.profiles) {
      assert.equal(
        profile.folder,
        expectedFolders[profile.id],
        `Storage profile "${profile.id}" changed its R2 object prefix.`,
      );
      assert.ok(
        !('cloudFolder' in profile),
        `Storage profile "${profile.id}" still declares a second folder.`,
      );
    }

    // 6. No server upload path writes beneath the old filesystem image tree.
    const resolverSource = readFileSync(
      path.join(process.cwd(), 'packages/storage-core/src/server/providers/provider-resolver.ts'),
      'utf8',
    );
    assert.doesNotMatch(resolverSource, /sync_file/);
    assert.doesNotMatch(resolverSource, /LocalStorageProvider/);

    console.log('✅ Integration test: parameterized store passed');
  } finally {
    process.env = originalEnv;
  }
}
