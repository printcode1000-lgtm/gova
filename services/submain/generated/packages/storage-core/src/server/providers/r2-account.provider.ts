import type { StorageAccountId } from '../../domain/accounts/account-id';
import {
  uploadR2Object,
  deleteR2Object,
  r2ObjectExists,
  buildR2PublicObjectUrl,
  listR2Objects,
} from '../transport/r2-object-store';
import type {
  IStorageProvider,
  StorageObjectEntry,
} from './storage-provider.interface';

/** Single account-parameterized Cloudflare R2 provider. */
export class R2AccountProvider implements IStorageProvider {
  constructor(readonly accountId: StorageAccountId = 'general') {}

  get providerId(): string {
    if (this.accountId === 'general') return 'CloudflareR2';
    if (this.accountId === 'products') return 'CloudflareR2Products';
    return `CloudflareR2_${this.accountId}`;
  }

  async upload(objectPath: string, body: Buffer, contentType: string): Promise<{ url: string }> {
    const url = await uploadR2Object(objectPath, body, contentType, this.accountId);
    return { url };
  }

  async delete(objectPath: string): Promise<void> {
    await deleteR2Object(objectPath, this.accountId);
  }

  async exists(objectPath: string): Promise<boolean> {
    return r2ObjectExists(objectPath, this.accountId);
  }

  resolvePublicUrl(objectPath: string): string {
    return buildR2PublicObjectUrl(objectPath, this.accountId);
  }

  async list(prefix: string): Promise<StorageObjectEntry[]> {
    const items = await listR2Objects(prefix, this.accountId);
    return items.map((item) => ({
      path: item.key,
      updatedAt: item.lastModified?.toISOString(),
    }));
  }
}

export const cloudflareR2Provider = new R2AccountProvider('general');
export const cloudflareR2ProductsProvider = new R2AccountProvider('products');
