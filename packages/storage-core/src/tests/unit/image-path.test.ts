import assert from 'node:assert/strict';
import { assertPathUnderImagesRoot, buildObjectPath, extractImageKeyFromPath } from '../../domain/images/image-path';
import { storageFolderForProvider, storageFolderCandidates } from '../../domain/profiles/storage-profile-path';
import { StorageProfile } from '../../domain/profiles/storage-profile.types';

export function runImagePathTest() {
  const profile: StorageProfile = {
    id: 'productDefault',
    enabled: true,
    provider: 'CloudflareR2Products',
    folder: 'images/products',
    cloudFolder: 'images/products',
    outputFormat: 'webp',
    maxImageSizeKB: 2048,
  };

  const pathWithKey = buildObjectPath(profile.folder, 'my-image.webp');
  assert.equal(pathWithKey, 'images/products/my-image.webp');

  assert.equal(extractImageKeyFromPath('images/products/my-image.webp'), 'my-image.webp');

  assert.doesNotThrow(() => assertPathUnderImagesRoot('images/products/my-image.webp'));
  assert.throws(() => assertPathUnderImagesRoot('invalid/path/my-image.webp'));

  const folder = storageFolderForProvider(profile, 'CloudflareR2Products');
  assert.equal(folder, 'images/products');

  const candidates = storageFolderCandidates(profile);
  assert.ok(candidates.includes('images/products'));

  console.log('✅ Unit test: image path passed');
}
