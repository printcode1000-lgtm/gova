import 'server-only';

import { getProductR2PublicUrl } from '@/core/config/server-env.values';
import {
  deleteProductR2Object,
  listProductR2Objects,
  productR2ObjectExists,
  uploadProductR2Object,
} from '@/core/provisioning/r2-s3-client';
import { buildR2PublicObjectUrl } from '@/core/provisioning/r2-cors-policy';
import type {
  IStorageProvider,
  StorageObjectEntry,
} from './storage-provider.interface';

/** Product images use the legacy product R2 bucket/account. */
export class CloudflareR2ProductsProvider implements IStorageProvider {
  readonly providerId = 'CloudflareR2Products';

  async upload(objectPath: string, body: Buffer, contentType: string): Promise<{ url: string }> {
    const result = await uploadProductR2Object(objectPath, body, contentType);
    return { url: result.publicUrl };
  }

  async delete(objectPath: string): Promise<void> {
    await deleteProductR2Object(objectPath);
  }

  exists(objectPath: string): Promise<boolean> {
    return productR2ObjectExists(objectPath);
  }

  resolvePublicUrl(objectPath: string): string {
    return buildR2PublicObjectUrl(getProductR2PublicUrl(), objectPath);
  }

  async list(prefix: string): Promise<StorageObjectEntry[]> {
    const objects: StorageObjectEntry[] = [];
    let continuationToken: string | undefined;
    do {
      const page = await listProductR2Objects(prefix, 1000, continuationToken);
      objects.push(...page.objects);
      continuationToken = page.isTruncated
        ? page.continuationToken
        : undefined;
    } while (continuationToken);
    return objects;
  }
}

export const cloudflareR2ProductsProvider = new CloudflareR2ProductsProvider();
