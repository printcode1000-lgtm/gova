import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { getStorageAccount, getAllStorageAccounts } from '../domain/accounts/account-registry';

/**
 * Guards the three-account R2 split.
 *
 * Account 1 (products): holds product images and nothing else.
 * Account 2 (general): holds profile images, covers, advertisements, and special orders.
 * Account 3 (ota): holds OTA release manifests, file trees, history, and transport bundles.
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

  // ── 1. Exactly one storage profile may use the product account ───────────────

  interface StorageProfileEntry {
    id: string;
    provider: string;
  }

  const profiles = (
    JSON.parse(read('src', 'config', 'storage-profiles.json')) as {
      profiles: StorageProfileEntry[];
    }
  ).profiles;

  const productProfiles = profiles
    .filter((profile) => profile.provider === 'CloudflareR2Products')
    .map((profile) => profile.id);

  assert.deepEqual(
    productProfiles,
    ['product-default'],
    'The product R2 account serves product images and nothing else. ' +
      `Profiles pointing at it: ${productProfiles.join(', ') || 'none'}.`,
  );

  for (const profile of profiles) {
    assert.ok(
      profile.provider === 'CloudflareR2' ||
        profile.provider === 'CloudflareR2Products',
      `Storage profile "${profile.id}" uses ${profile.provider}, which is neither R2 account.`,
    );
  }

  // ── 2. OTA may not inherit either account's credentials ──────────────────────

  const otaSources = [
    ['packages', 'ota-core', 'src', 'publishing', 'adapters', 'r2-storage.adapter.ts'],
    ['packages', 'ota-core', 'src', 'publishing', 'config', 'ota-config.ts'],
    ['src', 'core', 'config', 'server-env.values.ts'],
    ['src', 'core', 'config', 'server-env', 'server-env.values.auth-notifications.ts'],
    ['src', 'modules', 'release-commands', 'domain', 'build-command-catalog.ts'],
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

  // ── 4. Product images are stored as keys, never as URLs ──────────────────────

  const productRowModule = stripComments(
    read('packages', 'product-core', 'src', 'server', 'product-row.ts'),
  );
  const serializeImages = /export function serializeProductImages\([\s\S]*?\n}/.exec(
    productRowModule,
  );
  assert.ok(serializeImages, 'serializeProductImages not found in @asol/product-core/server');
  assert.match(
    serializeImages[0],
    /JSON\.stringify\(\s*images\.map\(\(image\) => \(\{ imageKey: image\.imageKey \}\)\)/,
    'products.images_json must persist keys only.',
  );

  const parseProductImages = /export function parseProductImages\([\s\S]*?\n}/.exec(
    productRowModule,
  );
  assert.ok(parseProductImages, 'parseProductImages not found in @asol/product-core/server');
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
    'product-repository must persist rows through @asol/product-core/server row mapping.',
  );

  // ── 5. R2 Storage Accounts distinctness ───────────────────────────

  const general = getStorageAccount('general');
  const productsAcc = getStorageAccount('products');

  assert.notEqual(general.accountId, productsAcc.accountId, 'products accountId must not match general');
  assert.notEqual(general.endpoint, productsAcc.endpoint, 'products endpoint must not match general');
  assert.notEqual(general.bucketName, productsAcc.bucketName, 'products bucketName must not match general');
  assert.notEqual(general.publicUrl, productsAcc.publicUrl, 'products publicUrl must not match general');

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
