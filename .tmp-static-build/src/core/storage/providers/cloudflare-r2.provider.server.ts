import 'server-only';

import { getR2Config } from '@/core/config/server-env.values';
import { uploadR2Object, deleteR2Object } from '@/core/provisioning/r2-s3-client';
import { buildR2PublicObjectUrl } from '@/core/provisioning/r2-cors-policy';
import type { IStorageProvider } from './storage-provider.interface';

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
}

export const cloudflareR2Provider = new CloudflareR2Provider();
