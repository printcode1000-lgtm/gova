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

/**
 * The provider a storage profile names, in every runtime.
 *
 * Development used to be answered here with a filesystem provider regardless of
 * what the profile said, so an upload in `next dev` landed under `public/` and a
 * missing R2 credential was invisible until a deployment. Uploads now reach the
 * account the profile declares wherever the code runs, which also means a
 * misconfigured account fails on the developer's machine — the only place it is
 * cheap to find.
 *
 * There is no fallback of any kind: not to disk, and not to a different R2
 * account. Falling back across accounts would write an object where nothing
 * looks for it and report success.
 */
export function resolveStorageProvider(profileProvider: StorageProviderId): IStorageProvider {
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
    `Server image storage requires a Cloudflare R2 storage provider, received: ${profileProvider}`,
  );
}

export function resolveActiveProviderId(profileProvider: StorageProviderId): StorageProviderId {
  if (
    profileProvider !== 'CloudflareR2' &&
    profileProvider !== 'CloudflareR2Products' &&
    !profileProvider.startsWith('CloudflareR2_')
  ) {
    throw new Error(
      `Server image storage requires a Cloudflare R2 storage provider, received: ${profileProvider}`,
    );
  }
  return profileProvider;
}
