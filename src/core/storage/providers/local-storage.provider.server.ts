import 'server-only';

import {
  mkdirSync,
  writeFileSync,
  unlinkSync,
  existsSync,
  readdirSync,
  statSync,
} from 'fs';
import path from 'path';
import { publicEnv } from '@/core/config/public-env';
import { assertPathUnderImagesRoot } from '../storage/image-path';
import type {
  IStorageProvider,
  StorageObjectEntry,
} from './storage-provider.interface';

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

  exists(objectPath: string): Promise<boolean> {
    assertPathUnderImagesRoot(objectPath);
    return Promise.resolve(existsSync(path.join(LOCAL_SYNC_ROOT, objectPath)));
  }

  resolvePublicUrl(objectPath: string): string {
    const base = publicEnv.basePath.replace(/\/$/, '');
    const normalized = objectPath.replace(/^\/+/, '');
    return `${base}/sync_data/sync_file/${normalized}`;
  }

  list(prefix: string): Promise<StorageObjectEntry[]> {
    assertPathUnderImagesRoot(prefix);
    const root = path.join(LOCAL_SYNC_ROOT, prefix);
    if (!existsSync(root)) return Promise.resolve([]);
    const objects: StorageObjectEntry[] = [];
    const walk = (directory: string) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) walk(fullPath);
        else if (entry.isFile()) {
          objects.push({
            path: path.relative(LOCAL_SYNC_ROOT, fullPath).replace(/\\/g, '/'),
            updatedAt: statSync(fullPath).mtime.toISOString(),
          });
        }
      }
    };
    walk(root);
    return Promise.resolve(objects);
  }
}

export const localStorageProvider = new LocalStorageProvider();
