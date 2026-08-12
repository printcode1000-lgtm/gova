import 'server-only';

import { isDevRuntime, isProvisioningContext } from '@/core/config/runtime-context.server';
import { getTursoNotificationsRuntimeCredentials } from '@/core/config/server-env';

let tursoNotificationsClientInstance: unknown | null = null;

function assertTursoNotificationsAccessAllowed(): void {
  if (typeof window !== 'undefined') {
    throw new Error(
      'getTursoNotificationsClient() is server-only. Clients must use Business APIs (/api/*).'
    );
  }

  if (isDevRuntime() && !isProvisioningContext()) {
    throw new Error(
      'Turso notifications DB cannot be accessed during development runtime. ' +
        'Development must use local SQLite only (public/sync_data/sync_sqlite/notifications.db).'
    );
  }
}

export function getTursoNotificationsClient(): ReturnType<typeof createTursoNotificationsClient> {
  assertTursoNotificationsAccessAllowed();

  if (tursoNotificationsClientInstance) {
    return tursoNotificationsClientInstance as ReturnType<typeof createTursoNotificationsClient>;
  }

  tursoNotificationsClientInstance = createTursoNotificationsClient();
  return tursoNotificationsClientInstance as ReturnType<typeof createTursoNotificationsClient>;
}

function createTursoNotificationsClient() {
  const { createClient } = require('@libsql/client');
  const { url, authToken } = getTursoNotificationsRuntimeCredentials();
  return createClient({ url, authToken });
}
