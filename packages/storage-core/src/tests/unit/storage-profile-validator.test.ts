import assert from 'node:assert/strict';
import { validateStorageProfilesFile } from '../../domain/profiles/storage-profile-validator';

export function runStorageProfileValidatorTest() {
  // 1. Valid storage profiles definition
  const validProfiles = {
    version: 1,
    profiles: [
      {
        id: 'avatar',
        enabled: true,
        provider: 'CloudflareR2',
        folder: 'images/profile',
        cloudFolder: 'images/profile',
        storageAccount: 'general',
        outputFormat: 'webp',
        maxImageSizeKB: 2048,
      },
    ],
  };

  const result = validateStorageProfilesFile(validProfiles);
  assert.equal(result.version, 1);
  assert.equal(result.profiles.length, 1);

  // 2. Unknown provider
  const invalidProvider = {
    version: 1,
    profiles: [
      {
        ...validProfiles.profiles[0],
        provider: 'UnknownProvider',
      },
    ],
  };
  assert.throws(
    () => validateStorageProfilesFile(invalidProvider),
    (err: any) => err instanceof Error && err.message.includes('invalid provider'),
    'Unknown provider must fail validation',
  );

  // 3. Duplicate profile ID
  const duplicateProfiles = {
    version: 1,
    profiles: [
      validProfiles.profiles[0],
      validProfiles.profiles[0],
    ],
  };
  assert.throws(
    () => validateStorageProfilesFile(duplicateProfiles),
    (err: any) => err instanceof Error && err.message.includes('duplicate profile id'),
    'Duplicate profile IDs must fail validation',
  );

  console.log('✅ Unit test: storage profile validator passed');
}
