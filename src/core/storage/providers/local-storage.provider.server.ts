import 'server-only';

import {
  mkdirSync,
  writeFileSync,
  unlinkSync,
  existsSync,
  readdirSync,
} from 'fs';
import path from 'path';
import { publicEnv } from '@/core/config/public-env';
import { assertPathUnderImagesRoot } from '../storage/image-path';
import type { IStorageProvider } from './storage-provider.interface';

/** Local dev root — all files live under sync_file/images/... */
const LOCAL_SYNC_ROOT = path.join(process.cwd(), 'public', 'sync_data', 'sync_file');

/**
 * Development-only provider — mirrors cloud folder layout under public/sync_data/sync_file.
 * Never used in production or static/Capacitor builds.
 */
export class LocalStorageProvider implements IStorageProvider {
  readonly providerId = 'LocalStorage';

  upload(objectPath: string, body: Buffer, _contentType: string): Promise<{ url: string }> {
    assertPathUnderImagesRoot(objectPath);
    const fullPath = path.join(LOCAL_SYNC_ROOT, objectPath);
    mkdirSync(path.dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, body);
    return Promise.resolve({ url: this.resolvePublicUrl(objectPath) });
  }

  delete(objectPath: string): Promise<void> {
    assertPathUnderImagesRoot(objectPath);
    const fullPath = path.join(LOCAL_SYNC_ROOT, objectPath);
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

  list(prefix: string): Promise<string[]> {
    assertPathUnderImagesRoot(prefix);
    const root = path.join(LOCAL_SYNC_ROOT, prefix);
    if (!existsSync(root)) return Promise.resolve([]);
    const keys: string[] = [];
    const walk = (directory: string) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) walk(fullPath);
        else if (entry.isFile()) {
          keys.push(path.relative(LOCAL_SYNC_ROOT, fullPath).replace(/\\/g, '/'));
        }
      }
    };
    walk(root);
    return Promise.resolve(keys);
  }
}

export const localStorageProvider = new LocalStorageProvider();
