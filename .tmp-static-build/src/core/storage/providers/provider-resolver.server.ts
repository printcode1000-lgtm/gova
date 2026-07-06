import 'server-only';

import { isDevRuntime } from '@/core/config/runtime-env';
import type { StorageProviderId } from '../types/storage-profile.types';
import type { IStorageProvider } from './storage-provider.interface';
import { cloudflareR2Provider } from './cloudflare-r2.provider.server';
import { localStorageProvider } from './local-storage.provider.server';

/**
 * Google Drive provider stub — extension point for future implementation.
 * Expects folderId + fileId in filePathOrProviderId metadata.
 */
export class GoogleDriveProvider implements IStorageProvider {
  readonly providerId = 'GoogleDrive';

  upload(_objectPath: string, _body: Buffer, _contentType: string): Promise<{ url: string }> {
    return Promise.reject(new Error('GoogleDriveProvider is not implemented'));
  }

  delete(_objectPath: string): Promise<void> {
    return Promise.reject(new Error('GoogleDriveProvider is not implemented'));
  }

  resolvePublicUrl(_objectPath: string): string {
    throw new Error('GoogleDriveProvider is not implemented');
  }
}

export const googleDriveProvider = new GoogleDriveProvider();

/** Returns true when the Node runtime is local development (not Capacitor/static). */
export function isLocalDevelopmentRuntime(): boolean {
  return isDevRuntime();
}

/**
 * Resolves the active provider for a profile.
 * In development always uses LocalStorageProvider regardless of profile provider.
 */
export function resolveStorageProvider(profileProvider: StorageProviderId): IStorageProvider {
  if (isLocalDevelopmentRuntime()) {
    return localStorageProvider;
  }

  switch (profileProvider) {
    case 'CloudflareR2':
      return cloudflareR2Provider;
    case 'GoogleDrive':
      return googleDriveProvider;
    case 'LocalStorage':
      return localStorageProvider;
    default:
      throw new Error(`Unsupported storage provider: ${profileProvider}`);
  }
}

/** Returns the provider id that will actually handle the upload. */
export function resolveActiveProviderId(profileProvider: StorageProviderId): StorageProviderId {
  if (isLocalDevelopmentRuntime()) return 'LocalStorage';
  return profileProvider;
}
