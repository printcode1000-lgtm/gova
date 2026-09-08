import { nodeRequire } from '../node-require';
import 'server-only';

import { getTursoAdvertisementsRuntimeCredentials } from '../../ports/runtime-config';

let tursoAdvertisementsClientInstance: unknown | null = null;

function assertTursoAdvertisementsAccessAllowed(): void {
  if (typeof window !== 'undefined') {
    throw new Error(
      'getTursoAdvertisementsClient() is server-only. Clients must use Business APIs (/api/*).'
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
  const { createClient } = nodeRequire('@libsql/client');
  const { url, authToken } = getTursoAdvertisementsRuntimeCredentials();
  return createClient({ url, authToken });
}
