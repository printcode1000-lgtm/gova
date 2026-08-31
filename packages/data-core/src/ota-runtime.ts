import 'server-only';

import { usersDataSource } from './core/data-source-registry';
import { createOtaReleaseRepository } from './domains/ota/repositories/ota-release-repository';

/** Main-app runtime binding for OTA persistence; never exposed to control. */
export function createMainOtaReleaseRepository() {
  return createOtaReleaseRepository(usersDataSource);
}
