import { validateStorageProfilesAtStartup } from '../src/server/profiles/storage-profile-loader';

try {
  const config = validateStorageProfilesAtStartup();
  console.log(`✅ storage-profiles.json is valid (v${config.version}, ${config.profiles.length} profiles).`);
} catch (error) {
  console.error('❌ storage-profiles.json validation failed:', error);
  process.exit(1);
}
