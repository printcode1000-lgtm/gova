import { readFileSync } from 'fs';
import path from 'path';
import storageProfilesConfig from '../../config/storage-profiles.json';
import { validateStorageProfilesFile } from '../../domain/profiles/storage-profile-validator';
import type {
  StorageProfile,
  StorageProfileClientView,
  StorageProfilesFile,
} from '../../domain/profiles/storage-profile.types';

/**
 * The profile file is part of this package, imported as a module rather than read from
 * `process.cwd()`.
 *
 * It used to live in the application at `src/config/storage-profiles.json` and be read by path,
 * which meant two things: this package could only load in a process whose working directory was
 * the repository root, and every deployment that needed profiles kept its own committed copy of
 * the file — three copies, kept in step by hand.
 *
 * The on-disk path below is used only by the hot-reload helper, which is developer tooling and
 * always runs from the repository root.
 */
const CONFIG_PATH = path.join(
  process.cwd(),
  'packages/storage-core/src/config/storage-profiles.json',
);

let cachedConfig: StorageProfilesFile | null = null;

/**
 * Validates the bundled configuration. Named "from disk" for the callers that already use it;
 * what it validates is the module above, so it works in every runtime rather than only where the
 * repository happens to be checked out.
 */
export function loadAndValidateStorageProfilesFromDisk(): StorageProfilesFile {
  return validateStorageProfilesFile(storageProfilesConfig as unknown);
}

function loadConfig(): StorageProfilesFile {
  if (cachedConfig) return cachedConfig;
  cachedConfig = loadAndValidateStorageProfilesFromDisk();
  return cachedConfig;
}

/** Validates config at module load — fails startup on invalid configuration. */
export function ensureStorageProfilesValidated(): StorageProfilesFile {
  return loadConfig();
}

/** Loads all storage profiles (validated, server-only). */
export function getAllStorageProfiles(): StorageProfile[] {
  return loadConfig().profiles;
}

/** Resolves a storage profile by id. Throws if not found. */
export function getStorageProfileById(profileId: string): StorageProfile {
  const profile = loadConfig().profiles.find((p) => p.id === profileId);
  if (!profile) {
    throw new Error(`Unknown storage profile: ${profileId}`);
  }
  return profile;
}

/** Throws when a profile exists but is disabled (upload/delete). */
export function assertStorageProfileEnabled(profile: StorageProfile): void {
  if (!profile.enabled) {
    throw new Error(`Storage profile is disabled: ${profile.id}`);
  }
}

/** Returns the full client-safe profile (no provider/folder). */
export function toStorageProfileClientView(profile: StorageProfile): StorageProfileClientView {
  return {
    id: profile.id,
    maxImageSizeKB: profile.maxImageSizeKB,
    outputFormat: profile.outputFormat,
    enabled: profile.enabled,
  };
}

/** Clears cache (tests). */
export function clearStorageProfileCache(): void {
  cachedConfig = null;
}

/** Hot-reload helper — re-reads and validates JSON from disk. */
export function reloadStorageProfilesFromDisk(): StorageProfilesFile {
  const raw = readFileSync(CONFIG_PATH, 'utf8');
  cachedConfig = validateStorageProfilesFile(JSON.parse(raw) as unknown);
  return cachedConfig;
}

/** Startup hook — fails immediately when configuration is invalid. */
export function validateStorageProfilesAtStartup(): StorageProfilesFile {
  return loadConfig();
}

// Fail fast when this module is first imported on the server.
ensureStorageProfilesValidated();
