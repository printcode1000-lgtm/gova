import 'server-only';

import { isDevRuntime, isProvisioningContext } from '@/core/config/runtime-env';
import { getTursoRuntimeCredentials } from '@/core/config/server-env';

let tursoClientInstance: unknown | null = null;

function assertTursoAccessAllowed(): void {
  if (typeof window !== 'undefined') {
    throw new Error(
      'getTursoClient() is server-only. Clients must use Business APIs (/api/*).'
    );
  }

  if (isDevRuntime() && !isProvisioningContext()) {
    throw new Error(
      'Turso cannot be accessed during development runtime. ' +
        'Development must use local SQLite only (public/sync_data/sync_sqlite).'
    );
  }
}

export function getTursoClient(): ReturnType<typeof createTursoClient> {
  assertTursoAccessAllowed();

  if (tursoClientInstance) {
    return tursoClientInstance as ReturnType<typeof createTursoClient>;
  }

  tursoClientInstance = createTursoClient();
  return tursoClientInstance as ReturnType<typeof createTursoClient>;
}

function createTursoClient() {
  const { createClient } = require('@libsql/client');
  const { url, authToken } = getTursoRuntimeCredentials();
  return createClient({ url, authToken });
}
