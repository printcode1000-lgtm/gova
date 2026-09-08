import { nodeRequire } from '../node-require';
import 'server-only';

import { getTursoNotificationsRuntimeCredentials } from '../../ports/runtime-config';

let tursoNotificationsClientInstance: unknown | null = null;

function assertTursoNotificationsAccessAllowed(): void {
  if (typeof window !== 'undefined') {
    throw new Error(
      'getTursoNotificationsClient() is server-only. Clients must use Business APIs (/api/*).'
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
  const { createClient } = nodeRequire('@libsql/client');
  const { url, authToken } = getTursoNotificationsRuntimeCredentials();
  return createClient({ url, authToken });
}
