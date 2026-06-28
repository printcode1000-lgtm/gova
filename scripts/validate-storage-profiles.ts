import { validateStorageProfilesAtStartup } from '../src/core/storage/profiles/storage-profile-validator';

try {
  const config = validateStorageProfilesAtStartup();
  console.log(`✔ storage-profiles.json v${config.version} (${config.profiles.length} profiles)`);
} catch (error) {
  console.error('✖ storage-profiles.json validation failed');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
