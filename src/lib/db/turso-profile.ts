import 'server-only';

import { isDevRuntime, isProvisioningContext } from '@/core/config/runtime-env';
import { getTursoProfileRuntimeCredentials } from '@/core/config/server-env';

let tursoProfileClientInstance: unknown | null = null;

function assertTursoProfileAccessAllowed(): void {
  if (typeof window !== 'undefined') {
    throw new Error(
      'getTursoProfileClient() is server-only. Clients must use Business APIs (/api/*).'
    );
  }

  if (isDevRuntime() && !isProvisioningContext()) {
    throw new Error(
      'Turso profile DB cannot be accessed during development runtime. ' +
        'Development must use local SQLite only (public/sync_data/sync_sqlite/profile.db).'
    );
  }
}

export function getTursoProfileClient(): ReturnType<typeof createTursoProfileClient> {
  assertTursoProfileAccessAllowed();

  if (tursoProfileClientInstance) {
    return tursoProfileClientInstance as ReturnType<typeof createTursoProfileClient>;
  }

  tursoProfileClientInstance = createTursoProfileClient();
  return tursoProfileClientInstance as ReturnType<typeof createTursoProfileClient>;
}

function createTursoProfileClient() {
  const { createClient } = require('@libsql/client');
  const { url, authToken } = getTursoProfileRuntimeCredentials();
  return createClient({ url, authToken });
}
