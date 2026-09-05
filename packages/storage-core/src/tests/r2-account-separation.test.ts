import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { getStorageAccount } from '../domain/accounts/account-registry';

/**
 * Guards the four-account R2 split (three media + OTA).
 *
 * Account 1 (products): legacy product catalog images.
 * Account 2 (products-apparel-pets): apparel/fashion + pets product images.
 * Account 3 (general): profile images, covers, advertisements, special orders.
 * Account 4 (ota): OTA release manifests, file trees, history, and transport bundles.
 *
 * A fallback across an account boundary is the failure mode: it does not error,
 * it writes somewhere else. These assertions are about shape, not about live
 * buckets, so they run offline and fail at the moment the shape returns.
 */

export async function runR2AccountSeparationTest() {
  const root = process.cwd();
  const read = (...segments: string[]) =>
    readFileSync(path.join(root, ...segments), 'utf8');
  const stripComments = (source: string) =>
    source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

  // ── 1. Exactly one storage profile per product account ───────────────────────

  interface StorageProfileEntry {
    id: string;
    provider: string;
  }

  const profiles = (
    JSON.parse(read('packages', 'storage-core', 'src', 'config', 'storage-profiles.json')) as {
      profiles: StorageProfileEntry[];
    }
  ).profiles;

  const productProfiles = profiles
    .filter((profile) => profile.provider === 'CloudflareR2Products')
    .map((profile) => profile.id);

  assert.deepEqual(
    productProfiles,
    ['product-default'],
    'The legacy product R2 account serves product-default only. ' +
      `Profiles pointing at it: ${productProfiles.join(', ') || 'none'}.`,
  );

  const apparelPetsProfiles = profiles
    .filter((profile) => profile.provider === 'CloudflareR2_products-apparel-pets')
    .map((profile) => profile.id);

  assert.deepEqual(
    apparelPetsProfiles,
    ['product-apparel-pets'],
    'The apparel-pets R2 account serves product-apparel-pets only. ' +
      `Profiles pointing at it: ${apparelPetsProfiles.join(', ') || 'none'}.`,
  );

  const allowedProviders = new Set([
    'CloudflareR2',
    'CloudflareR2Products',
    'CloudflareR2_products-apparel-pets',
  ]);

  for (const profile of profiles) {
    assert.ok(
      allowedProviders.has(profile.provider),
      `Storage profile "${profile.id}" uses ${profile.provider}, which is not a known R2 account.`,
    );
  }

  // ── 2. OTA may not inherit either account's credentials ──────────────────────

  const otaSources = [
    ['packages', 'ota-core', 'src', 'publishing', 'adapters', 'r2-storage.adapter.ts'],
    ['packages', 'ota-core', 'src', 'publishing', 'config', 'ota-config.ts'],
    ['src', 'core', 'config', 'server-env.values.ts'],
    ['src', 'core', 'config', 'server-env', 'server-env.values.auth-notifications.ts'],
    ['packages', 'release-core', 'src', 'console', 'build-command-catalog.ts'],
  ] as const;

  for (const segments of otaSources) {
    const file = path.join(...segments);
    if (!readFileSync(path.join(root, ...segments), { flag: 'r' })) continue;
    const source = stripComments(read(...segments));
    const R2_VARIABLE = /(?<![A-Z0-9_])[A-Z][A-Z0-9_]*_R2_[A-Z0-9_]+/g;
    for (const line of source.split('\n')) {
      if (!line.includes('ASOL_OTA_R2_')) continue;
      for (const name of line.match(R2_VARIABLE) ?? []) {
        assert.ok(
          name.startsWith('ASOL_OTA_R2_'),
          `${file} falls back from an OTA credential to ${name}. ` +
            'A fallback across accounts writes to the wrong bucket instead of failing.',
        );
      }
    }
  }

  const otaConfig = stripComments(read('packages', 'ota-core', 'src', 'publishing', 'config', 'ota-config.ts'));
  for (const name of otaConfig.match(/(?<![A-Z0-9_])[A-Z][A-Z0-9_]*_R2_[A-Z0-9_]+/g) ?? []) {
    assert.ok(
      name.startsWith('ASOL_OTA_R2_'),
      `ota-config.ts reads ${name}. OTA has its own ASOL_OTA_R2_* credentials.`,
    );
  }

  // ── 3. Reading an image may not require an account-management token ──────────

  const r2ObjectStore = stripComments(read('packages', 'storage-core', 'src', 'server', 'transport', 'r2-object-store.ts'));
  const match = /export async function r2ObjectExists[\s\S]*?\n}/.exec(r2ObjectStore);
  assert.ok(match, 'r2ObjectExists not found in r2-object-store.ts');
  assert.doesNotMatch(
    match[0],
    /getAccountCloudflareCredentials\(\)|getAccountConfig\(\)/,
    'r2ObjectExists pulls full R2 config requiring *_API_TOKEN. An existence check is not an account operation.',
  );

  const providerSource = stripComments(read('packages', 'storage-core', 'src', 'server', 'providers', 'r2-account.provider.ts'));
  const resolvePublicUrlMatch = /resolvePublicUrl\([\s\S]*?\n  }/.exec(providerSource);
  assert.ok(resolvePublicUrlMatch, 'resolvePublicUrl not found in R2AccountProvider');
  assert.doesNotMatch(
    resolvePublicUrlMatch[0],
    /getAccountCloudflareCredentials\(\)|getAccountConfig\(\)/,
    'resolvePublicUrl pulls full R2 config. Turning a key into a URL needs the public base URL alone.',
  );

  // ── 4. Product images are stored as keys (+ optional storageProfileId) ───────

  const productRowModule = stripComments(
    read(
      'packages',
      'data-core',
      'src',
      'domains',
      'product',
      'repositories',
      'product-persistence.ts',
    ),
  );
  const serializeImages = /export function serializeProductImages\([\s\S]*?\n}/.exec(
    productRowModule,
  );
  assert.ok(serializeImages, 'serializeProductImages not found in @asol/data-core product persistence');
  assert.match(
    serializeImages[0],
    /imageKey:\s*image\.imageKey/,
    'products.images_json must persist imageKey.',
  );
  assert.match(
    serializeImages[0],
    /storageProfileId/,
    'serializeProductImages must be able to persist storageProfileId for non-default profiles.',
  );
  assert.doesNotMatch(
    serializeImages[0],
    /\burl:\s*image\.url\b/,
    'products.images_json must never persist absolute urls.',
  );

  const parseProductImages = /export function parseProductImages\([\s\S]*?\n}/.exec(
    productRowModule,
  );
  assert.ok(parseProductImages, 'parseProductImages not found in @asol/data-core product persistence');
  assert.doesNotMatch(
    parseProductImages[0],
    /url:\s*image\.url/,
    'parseProductImages must not require a stored `url`. Rows hold keys only.',
  );

  const repository = stripComments(
    read(
      'packages', 'data-core', 'src',
      'domains',
      'product',
      'repositories',
      'product-repository.ts',
    ),
  );
  assert.match(
    repository,
    /productRowValues/,
    'product-repository must persist rows through @asol/data-core product persistence row mapping.',
  );

  // ── 5. Three media accounts are distinct (no shared identity fields) ─────────

  const general = getStorageAccount('general');
  const productsAcc = getStorageAccount('products');
  const apparelPetsAcc = getStorageAccount('products-apparel-pets');

  const mediaAccounts = [general, productsAcc, apparelPetsAcc];
  for (let i = 0; i < mediaAccounts.length; i += 1) {
    for (let j = i + 1; j < mediaAccounts.length; j += 1) {
      const left = mediaAccounts[i];
      const right = mediaAccounts[j];
      assert.notEqual(
        left.accountId,
        right.accountId,
        `${left.id} accountId must not match ${right.id}`,
      );
      assert.notEqual(
        left.endpoint,
        right.endpoint,
        `${left.id} endpoint must not match ${right.id}`,
      );
      assert.notEqual(
        left.bucketName,
        right.bucketName,
        `${left.id} bucketName must not match ${right.id}`,
      );
      assert.notEqual(
        left.publicUrl,
        right.publicUrl,
        `${left.id} publicUrl must not match ${right.id}`,
      );
      assert.notEqual(
        left.envPrefix,
        right.envPrefix,
        `${left.id} envPrefix must not match ${right.id}`,
      );
    }
  }

  assert.equal(apparelPetsAcc.envPrefix, 'APPAREL_PETS_R2');
  assert.equal(apparelPetsAcc.bucketName, 'productcat1');

  // ── 6. No reference to ASOL_OTA_LEGACY_R2_ in codebase ────────────────────────

  const LEGACY_TOKEN = ['ASOL', 'OTA', 'LEGACY', 'R2'].join('_');

  function scanForLegacyOta(dir: string): string[] {
    const violations: string[] = [];
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        violations.push(...scanForLegacyOta(fullPath));
      } else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) {
        if (fullPath.includes('r2-account-separation.test.ts')) {
          continue;
        }
        const content = readFileSync(fullPath, 'utf8');
        if (content.includes(LEGACY_TOKEN)) {
          violations.push(path.relative(root, fullPath));
        }
      }
    }
    return violations;
  }

  const legacyViolations = [
    ...scanForLegacyOta(path.join(root, 'packages', 'ota-core', 'src')),
    ...scanForLegacyOta(path.join(root, 'packages', 'storage-core', 'src')),
    ...scanForLegacyOta(path.join(root, 'src')),
    ...scanForLegacyOta(path.join(root, 'scripts')),
  ];
  assert.deepEqual(
    legacyViolations,
    [],
    `Found references to ASOL_OTA_LEGACY_R2_ in: ${legacyViolations.join(', ')}.`,
  );

  console.log('✅ R2 account separation contract passed.');
}
