import 'server-only';

import { getR2Config } from '@/core/config/server-env.values';
import {
  uploadR2Object,
  deleteR2Object,
  listR2Objects,
} from '@/core/provisioning/r2-s3-client';
import { buildR2PublicObjectUrl } from '@/core/provisioning/r2-cors-policy';
import type {
  IStorageProvider,
  StorageObjectEntry,
} from './storage-provider.interface';

/** Cloudflare R2 provider — wraps existing r2-s3-client without modification. */
export class CloudflareR2Provider implements IStorageProvider {
  readonly providerId = 'CloudflareR2';

  async upload(objectPath: string, body: Buffer, contentType: string): Promise<{ url: string }> {
    const result = await uploadR2Object(objectPath, body, contentType);
    return { url: result.publicUrl };
  }

  async delete(objectPath: string): Promise<void> {
    await deleteR2Object(objectPath);
  }

  resolvePublicUrl(objectPath: string): string {
    const { publicUrl } = getR2Config();
    return buildR2PublicObjectUrl(publicUrl, objectPath);
  }

  async list(prefix: string): Promise<StorageObjectEntry[]> {
    const objects: StorageObjectEntry[] = [];
    let continuationToken: string | undefined;
    do {
      const page = await listR2Objects(prefix, 1000, continuationToken);
      objects.push(...page.objects);
      continuationToken = page.isTruncated
        ? page.continuationToken
        : undefined;
    } while (continuationToken);
    return objects;
  }
}

export const cloudflareR2Provider = new CloudflareR2Provider();
