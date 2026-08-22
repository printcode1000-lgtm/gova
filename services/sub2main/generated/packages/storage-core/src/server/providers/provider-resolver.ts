import type { StorageProviderId } from '../../domain/profiles/storage-profile.types';
import type {
  IStorageProvider,
  StorageObjectEntry,
} from './storage-provider.interface';
import {
  R2AccountProvider,
  cloudflareR2Provider,
  cloudflareR2ProductsProvider,
} from './r2-account.provider';
import { localStorageProvider } from './local-storage.provider';

export class GoogleDriveProvider implements IStorageProvider {
  readonly providerId = 'GoogleDrive';

  upload(_objectPath: string, _body: Buffer, _contentType: string): Promise<{ url: string }> {
    return Promise.reject(new Error('GoogleDriveProvider is not implemented'));
  }

  delete(_objectPath: string): Promise<void> {
    return Promise.reject(new Error('GoogleDriveProvider is not implemented'));
  }

  exists(_objectPath: string): Promise<boolean> {
    return Promise.reject(new Error('GoogleDriveProvider is not implemented'));
  }

  resolvePublicUrl(_objectPath: string): string {
    throw new Error('GoogleDriveProvider is not implemented');
  }

  list(_prefix: string): Promise<StorageObjectEntry[]> {
    return Promise.reject(new Error('GoogleDriveProvider is not implemented'));
  }
}

export const googleDriveProvider = new GoogleDriveProvider();

const dynamicR2Providers = new Map<string, R2AccountProvider>();

export function isLocalDevelopmentRuntime(): boolean {
  return process.env.NODE_ENV === 'development' && !process.env.ASOL_PROVISIONING;
}

export function resolveStorageProvider(profileProvider: StorageProviderId): IStorageProvider {
  if (isLocalDevelopmentRuntime()) {
    return localStorageProvider;
  }

  if (profileProvider === 'CloudflareR2') return cloudflareR2Provider;
  if (profileProvider === 'CloudflareR2Products') return cloudflareR2ProductsProvider;

  if (profileProvider.startsWith('CloudflareR2_')) {
    const accountId = profileProvider.replace(/^CloudflareR2_/, '');
    const cached = dynamicR2Providers.get(accountId);
    if (cached) return cached;
    const provider = new R2AccountProvider(accountId);
    dynamicR2Providers.set(accountId, provider);
    return provider;
  }

  throw new Error(
    `Cloud runtime requires a Cloudflare R2 storage provider, received: ${profileProvider}`,
  );
}

export function resolveActiveProviderId(profileProvider: StorageProviderId): StorageProviderId {
  if (isLocalDevelopmentRuntime()) return 'LocalStorage';
  if (
    profileProvider !== 'CloudflareR2' &&
    profileProvider !== 'CloudflareR2Products' &&
    !profileProvider.startsWith('CloudflareR2_')
  ) {
    throw new Error(
      `Cloud runtime requires a Cloudflare R2 storage provider, received: ${profileProvider}`,
    );
  }
  return profileProvider;
}
