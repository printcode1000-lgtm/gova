import { getStorageAccountIds } from '../accounts/account-registry';
import { STORAGE_IMAGES_ROOT } from './storage-profiles.constants';
import { isAllowedOutputFormat } from '../images/output-format.registry';
import type {
  StorageProfile,
  StorageProfilesFile,
} from './storage-profile.types';

const REQUIRED_PROFILE_KEYS = [
  'id',
  'enabled',
  'provider',
  'folder',
  'maxImageSizeKB',
  'outputFormat',
] as const;

const STATIC_ALLOWED_PROVIDERS = new Set([
  'CloudflareR2',
  'CloudflareR2Products',
  'GoogleDrive',
  'LocalStorage',
]);

const DYNAMIC_R2_PROVIDER = /^CloudflareR2_([a-z0-9-]+)$/;

function isAllowedProvider(provider: string): boolean {
  if (STATIC_ALLOWED_PROVIDERS.has(provider)) return true;
  const match = DYNAMIC_R2_PROVIDER.exec(provider);
  if (!match) return false;
  return getStorageAccountIds().includes(match[1]);
}

function assertRequiredKeys(
  profile: Record<string, unknown>,
  index: number,
): void {
  for (const key of REQUIRED_PROFILE_KEYS) {
    if (profile[key] === undefined || profile[key] === null) {
      throw new Error(
        `storage-profiles.json profiles[${index}] missing required property: ${key}`,
      );
    }
  }
}

function validateProfile(profile: StorageProfile, seenIds: Set<string>): void {
  if (seenIds.has(profile.id)) {
    throw new Error(
      `storage-profiles.json duplicate profile id: ${profile.id}`,
    );
  }
  seenIds.add(profile.id);

  if (typeof profile.enabled !== 'boolean') {
    throw new Error(`Profile "${profile.id}": enabled must be boolean`);
  }

  if (!isAllowedProvider(profile.provider)) {
    throw new Error(
      `Profile "${profile.id}": invalid provider "${profile.provider}"`,
    );
  }

  if (
    typeof profile.maxImageSizeKB !== 'number' ||
    profile.maxImageSizeKB <= 0
  ) {
    throw new Error(
      `Profile "${profile.id}": maxImageSizeKB must be a positive number`,
    );
  }

  if (!isAllowedOutputFormat(profile.outputFormat)) {
    throw new Error(
      `Profile "${profile.id}": invalid outputFormat "${profile.outputFormat}"`,
    );
  }

  if (
    profile.folderStrategy !== undefined &&
    profile.folderStrategy !== 'main-category'
  ) {
    throw new Error(
      `Profile "${profile.id}": invalid folderStrategy "${profile.folderStrategy}"`,
    );
  }

  const folder = profile.folder.replace(/^\/+|\/+$/g, '');
  if (!folder.startsWith(`${STORAGE_IMAGES_ROOT}/`)) {
    throw new Error(
      `Profile "${profile.id}": folder must start with "${STORAGE_IMAGES_ROOT}/": ${profile.folder}`,
    );
  }

  if (profile.cloudFolder !== undefined) {
    const cloudFolder = profile.cloudFolder.replace(/^\/+|\/+$/g, '');
    if (!cloudFolder.startsWith(`${STORAGE_IMAGES_ROOT}/`)) {
      throw new Error(
        `Profile "${profile.id}": cloudFolder must start with "${STORAGE_IMAGES_ROOT}/": ${profile.cloudFolder}`,
      );
    }
  }
}

/** Parses and validates storage-profiles.json. Throws on any violation. Browser-safe. */
export function validateStorageProfilesFile(raw: unknown): StorageProfilesFile {
  if (!raw || typeof raw !== 'object') {
    throw new Error('storage-profiles.json must be a JSON object');
  }

  const file = raw as Record<string, unknown>;

  if (file.version === undefined || file.version === null) {
    throw new Error('storage-profiles.json missing required property: version');
  }
  if (typeof file.version !== 'number' || file.version < 1) {
    throw new Error('storage-profiles.json version must be a positive number');
  }

  if (!Array.isArray(file.profiles) || file.profiles.length === 0) {
    throw new Error(
      'storage-profiles.json must contain a non-empty profiles array',
    );
  }

  const seenIds = new Set<string>();
  const profiles: StorageProfile[] = [];

  file.profiles.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error(
        `storage-profiles.json profiles[${index}] must be an object`,
      );
    }
    assertRequiredKeys(entry as Record<string, unknown>, index);
    const profile = entry as StorageProfile;
    validateProfile(profile, seenIds);
    profiles.push(profile);
  });

  return { version: file.version as number, profiles };
}
