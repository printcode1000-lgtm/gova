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
export interface DataCoreRuntimeConfigPortOptions {
  /**
   * Pin the deployment to Turso regardless of what the environment says.
   *
   * The isolated accounts alias `better-sqlite3` to a stub that throws, because
   * they never run against local SQLite and bundling the native driver would
   * force a native build for unreachable code. That made the backend choice an
   * environment question with only one valid answer: a stray `local` data
   * source made the profiles service load a driver it does not ship, and every
   * route that reached data answered 500 with a message about a different
   * account entirely.
   *
   * An account that cannot run SQLite should not be asking. It states its own
   * invariant here instead of trusting a variable it does not control.
   */
  readonly forceRemoteDataSource?: boolean;
}

export function registerDataCoreRuntimeConfigPorts(
  options: DataCoreRuntimeConfigPortOptions = {},
): void {
  configureDataCoreRuntimeConfig({
    isDevelopment,
    isDevRuntime,
    isProvisioningContext,
    getServerRuntimeContext: () =>
      options.forceRemoteDataSource
        ? { ...getServerRuntimeContext(), dataSource: 'remote' }
        : getServerRuntimeContext(),
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
