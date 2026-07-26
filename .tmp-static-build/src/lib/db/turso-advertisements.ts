import 'server-only';

import { isDevRuntime, isProvisioningContext } from '@/core/config/runtime-env';
import { getTursoAdvertisementsRuntimeCredentials } from '@/core/config/server-env';

let tursoAdvertisementsClientInstance: unknown | null = null;

function assertTursoAdvertisementsAccessAllowed(): void {
  if (typeof window !== 'undefined') {
    throw new Error(
      'getTursoAdvertisementsClient() is server-only. Clients must use Business APIs (/api/*).'
    );
  }

  if (isDevRuntime() && !isProvisioningContext()) {
    throw new Error(
      'Turso advertisements DB cannot be accessed during development runtime. ' +
        'Development must use local SQLite only (public/sync_data/sync_sqlite/advertisements.db).'
    );
  }
}

export function getTursoAdvertisementsClient(): ReturnType<typeof createTursoAdvertisementsClient> {
  assertTursoAdvertisementsAccessAllowed();

  if (tursoAdvertisementsClientInstance) {
    return tursoAdvertisementsClientInstance as ReturnType<typeof createTursoAdvertisementsClient>;
  }

  tursoAdvertisementsClientInstance = createTursoAdvertisementsClient();
  return tursoAdvertisementsClientInstance as ReturnType<typeof createTursoAdvertisementsClient>;
}

function createTursoAdvertisementsClient() {
  const { createClient } = require('@libsql/client');
  const { url, authToken } = getTursoAdvertisementsRuntimeCredentials();
  return createClient({ url, authToken });
}
