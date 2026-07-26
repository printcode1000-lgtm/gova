import 'server-only';

import { readFileSync } from 'fs';
import path from 'path';
import {
  loadAndValidateStorageProfilesFromDisk,
  validateStorageProfilesFile,
} from './storage-profile-validator';
import type { StorageProfile, StorageProfileClientView, StorageProfilesFile } from '../types/storage-profile.types';

const CONFIG_PATH = path.join(process.cwd(), 'src/config/storage-profiles.json');

let cachedConfig: StorageProfilesFile | null = null;

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

// Fail fast when this module is first imported on the server.
ensureStorageProfilesValidated();
