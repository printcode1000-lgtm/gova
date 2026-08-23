import { configureDataCoreRuntimeConfig } from '@asol/data-core/runtime-config';
import { asolHttpFetch } from '@/core/api/asol-http-transport';
import { isDevelopment } from '@/core/config';
import {
  getServerRuntimeContext,
  isDevRuntime,
  isProvisioningContext,
} from '@/core/config/runtime-context.server';
import {
  getTursoAdvertisementsRuntimeCredentials,
  getTursoNotificationsRuntimeCredentials,
  getTursoPlatformCredentials,
  getTursoProductRuntimeCredentials,
  getTursoRuntimeCredentials,
  listLibsqlDatabaseUrlKeys,
  readOptionalEnv,
  writeTursoAdvertisementsRuntimeCredentials,
  writeTursoProductRuntimeCredentials,
  writeTursoRuntimeCredentials,
} from '@/core/config/server-env.values';

/**
 * The runtime-config port every deployment needs, and nothing else.
 *
 * `@asol/data-core` reads its environment and its Turso credentials through this
 * port. Without it, any route that
 * reaches a repository answers
 * `dataCoreRuntimeConfig: getServerRuntimeContext is not configured`.
 *
 * Deliberately env and credentials only. The specialty catalog and the
 * product-search fields are registered separately, by the accounts that read
 * profile rows and run search: folding either in here dragged a dependency
 * into the notifications mirror that the account does not declare, and
 * `services:sync` refused it. That refusal is the isolation rule working.
 *
 * The main application registers this too, through `registerDataCorePorts`.
 * One definition, so the accounts and the app cannot drift.
 */
export function registerDataCoreRuntimeConfigPorts(): void {
  configureDataCoreRuntimeConfig({
    isDevelopment,
    isDevRuntime,
    isProvisioningContext,
    getServerRuntimeContext: () => getServerRuntimeContext(),
    getTursoRuntimeCredentials,
    getTursoProductRuntimeCredentials,
    getTursoNotificationsRuntimeCredentials,
    getTursoAdvertisementsRuntimeCredentials,
    getTursoPlatformCredentials,
    writeTursoRuntimeCredentials,
    writeTursoProductRuntimeCredentials,
    writeTursoAdvertisementsRuntimeCredentials,
    readOptionalEnv,
    listLibsqlDatabaseUrlKeys,
    asolHttpFetch,
  });
}
