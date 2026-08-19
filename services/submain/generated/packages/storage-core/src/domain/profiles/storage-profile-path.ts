import type {
  StorageProfile,
  StorageProviderId,
} from './storage-profile.types';

export function storageFolderForProvider(
  profile: StorageProfile,
  providerId: StorageProviderId,
): string {
  if (providerId === 'CloudflareR2' || providerId === 'CloudflareR2Products') {
    return profile.cloudFolder ?? profile.folder;
  }
  return profile.folder;
}

export function storageFolderCandidates(profile: StorageProfile): string[] {
  return [...new Set([profile.cloudFolder, profile.folder].filter(Boolean))] as string[];
}
