import 'server-only';

import { readFileSync } from 'fs';
import path from 'path';
import type { StorageProfile, StorageProfileClientView } from '../types/storage-profile.types';

interface StorageProfilesFile {
  profiles: StorageProfile[];
}

let cachedProfiles: StorageProfile[] | null = null;

function loadProfilesFile(): StorageProfile[] {
  if (cachedProfiles) return cachedProfiles;

  const filePath = path.join(process.cwd(), 'src/config/storage-profiles.json');
  const raw = readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw) as StorageProfilesFile;

  if (!Array.isArray(parsed.profiles) || parsed.profiles.length === 0) {
    throw new Error('storage-profiles.json must contain at least one profile');
  }

  cachedProfiles = parsed.profiles;
  return cachedProfiles;
}

/** Loads all storage profiles from src/config/storage-profiles.json (server-only). */
export function getAllStorageProfiles(): StorageProfile[] {
  return loadProfilesFile();
}

/** Resolves a storage profile by id. Throws if not found. */
export function getStorageProfileById(profileId: string): StorageProfile {
  const profile = loadProfilesFile().find((p) => p.id === profileId);
  if (!profile) {
    throw new Error(`Unknown storage profile: ${profileId}`);
  }
  return profile;
}

/** Returns a client-safe view (id + maxImageSizeKB only). */
export function toStorageProfileClientView(profile: StorageProfile): StorageProfileClientView {
  return {
    id: profile.id,
    maxImageSizeKB: profile.maxImageSizeKB,
  };
}

/** Clears the in-memory cache (for tests). */
export function clearStorageProfileCache(): void {
  cachedProfiles = null;
}
