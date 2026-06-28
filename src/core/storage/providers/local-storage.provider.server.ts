import 'server-only';

import { mkdirSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import path from 'path';
import { publicEnv } from '@/core/config/public-env';
import type { IStorageProvider } from './storage-provider.interface';

const LOCAL_ROOT = path.join(process.cwd(), 'public', 'sync_data', 'sync_file');

/**
 * Development-only provider — mirrors cloud folder layout under public/sync_data/sync_file.
 * Never used in production or static/Capacitor builds.
 */
export class LocalStorageProvider implements IStorageProvider {
  readonly providerId = 'LocalStorage';

  upload(objectPath: string, body: Buffer, _contentType: string): Promise<{ url: string }> {
    const fullPath = path.join(LOCAL_ROOT, objectPath);
    mkdirSync(path.dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, body);
    return Promise.resolve({ url: this.resolvePublicUrl(objectPath) });
  }

  delete(objectPath: string): Promise<void> {
    const fullPath = path.join(LOCAL_ROOT, objectPath);
    if (existsSync(fullPath)) {
      unlinkSync(fullPath);
    }
    return Promise.resolve();
  }

  resolvePublicUrl(objectPath: string): string {
    const base = publicEnv.basePath.replace(/\/$/, '');
    const normalized = objectPath.replace(/^\/+/, '');
    return `${base}/sync_data/sync_file/${normalized}`;
  }
}

export const localStorageProvider = new LocalStorageProvider();
