import assert from 'node:assert/strict';
import {
  APPAREL_PETS_MAIN_CATEGORY_IDS,
  ONBOARDING_FASHION_CATEGORY_IDS,
  resolveProductStorageProfileId,
  resolveProductStorageProfileIdFromImageKey,
} from '../../domain/profiles/product-category-storage-routing';
import { StorageProfiles } from '../../domain/profiles/storage-profiles.constants';

export function runProductCategoryStorageRoutingTest() {
  assert.deepEqual([...APPAREL_PETS_MAIN_CATEGORY_IDS], ['1', '12']);
  assert.ok(ONBOARDING_FASHION_CATEGORY_IDS.includes('bags'));
  assert.ok(ONBOARDING_FASHION_CATEGORY_IDS.includes('formal'));

  assert.equal(
    resolveProductStorageProfileId('1'),
    StorageProfiles.ProductApparelPets,
  );
  assert.equal(
    resolveProductStorageProfileId('12'),
    StorageProfiles.ProductApparelPets,
  );
  for (const slug of ONBOARDING_FASHION_CATEGORY_IDS) {
    assert.equal(
      resolveProductStorageProfileId(slug),
      StorageProfiles.ProductApparelPets,
      `fashion slug "${slug}" must route to apparel-pets`,
    );
  }

  assert.equal(
    resolveProductStorageProfileId('2'),
    StorageProfiles.ProductDefault,
  );
  assert.equal(
    resolveProductStorageProfileId(''),
    StorageProfiles.ProductDefault,
  );
  assert.equal(
    resolveProductStorageProfileId(null),
    StorageProfiles.ProductDefault,
  );
  assert.equal(
    resolveProductStorageProfileId(undefined),
    StorageProfiles.ProductDefault,
  );
  assert.equal(
    resolveProductStorageProfileId('unknown-scope'),
    StorageProfiles.ProductDefault,
  );

  assert.equal(
    resolveProductStorageProfileIdFromImageKey('1/abc.webp'),
    StorageProfiles.ProductApparelPets,
  );
  assert.equal(
    resolveProductStorageProfileIdFromImageKey('bags/abc.webp'),
    StorageProfiles.ProductApparelPets,
  );
  assert.equal(
    resolveProductStorageProfileIdFromImageKey('5/abc.webp'),
    StorageProfiles.ProductDefault,
  );

  console.log('✅ Unit test: product category storage routing passed');
}
