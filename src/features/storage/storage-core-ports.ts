import 'server-only';

import { configureStorageCoreHttpFetch } from '@asol/storage-core/server';
import { asolHttpFetch } from '@/core/api/asol-http-transport';

/** Registers the designated HTTP gateway into `@asol/storage-core`. */
export function registerStorageCorePorts(): void {
  configureStorageCoreHttpFetch(asolHttpFetch);
}
