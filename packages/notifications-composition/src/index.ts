import {
  configureNotificationsCoreServerConfig,
  configureNotificationTokenStore,
} from '@asol/notifications-core/server';
import {
  DeleteNotificationTokenCommand,
  GetNotificationPushPreferenceQuery,
  ListNotificationTokensQuery,
} from '@asol/data-core/notifications';
import { NOTIFICATIONS_DECLARATION } from '@asol/account-declarations/notifications';
import * as serverEnv from '@/core/config/server-env';
import { registerDataCoreRuntimeConfigPorts } from '@/features/data/data-core-runtime-config-ports';
import {
  deliverNotificationGrants,
  readGrantsFromRequestBody,
  MAX_GRANTS_PER_REQUEST,
} from '@asol/notifications-core/server';

export interface NotificationsRuntimeConfig {
  /** Overrides the environment. Used by tests; production reads the declaration's keys. */
  env?: NodeJS.ProcessEnv;
}

/**
 * The crypto task — the reason this account exists.
 *
 * A grant is a decision the main app already signed. Verifying it *is* the whole
 * authorisation step, because nothing in the browser can widen a signature. There is no
 * bearer-token path on purpose: a shared bearer would let anything holding it send
 * anything to anyone, while a grant authorises exactly one pre-approved send.
 *
 * `readGrants` verifies, `MAX_GRANTS_PER_REQUEST` bounds the batch.
 */
export interface NotificationsCryptoTask {
  readGrants: typeof readGrantsFromRequestBody;
  maxGrantsPerRequest: typeof MAX_GRANTS_PER_REQUEST;
}

/**
 * Push fan-out: FCM, APNs and Web Push.
 *
 * `service-runtime` is the only notification path this deployment may reach. Going
 * further pulls the users repository onto an account that must never hold it, and the
 * mirror would carry it there. Naming one function here means a route cannot widen that
 * by adding an import — it has nothing else to import from.
 */
export interface NotificationsDeliveryTask {
  deliverGrants: typeof deliverNotificationGrants;
}

export interface NotificationsConfigTask {
  serverEnv: typeof serverEnv;
}

/**
 * The notifications account runtime, divided by task.
 *
 * An absent key is a capability the account cannot reach. This is the only account with a
 * `crypto` task, and it has no `images` task: it holds no R2 credential of any kind.
 * Its own database access lives behind `delivery` — device tokens and preferences — and
 * is not exposed as a task of its own, because no route may query it directly.
 */
export interface NotificationsRuntime {
  accountName: string;
  crypto: NotificationsCryptoTask;
  delivery: NotificationsDeliveryTask;
  config: NotificationsConfigTask;
}

/**
 * Rule 4 — validated against the declaration.
 *
 * This account's required set is the widest of the four: besides its Turso pair it needs
 * `ASOL_NOTIFICATION_GRANT_SECRET` and the VAPID keys, because verifying a grant and
 * signing a web push both happen here.
 */
export function assertNotificationsEnv(env: NodeJS.ProcessEnv = process.env): void {
  const missing = NOTIFICATIONS_DECLARATION.requiredEnv.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(
      `[notifications-composition] ${NOTIFICATIONS_DECLARATION.project} is missing required ` +
        `environment values: ${missing.join(', ')}`,
    );
  }
}

/** Layer 2 for the notifications account — the connector between its tasks. */
function wireNotificationsCoreServerConfig(): void {
  // Composition root for the notifications deployment (no app instrumentation.ts).
  configureNotificationsCoreServerConfig({
    getWebPushServerConfig: serverEnv.getWebPushServerConfig,
    getFirebaseAdminServiceAccount: serverEnv.getFirebaseAdminServiceAccount,
    getApnsServerConfig: serverEnv.getApnsServerConfig,
    getNotificationGrantSecret: serverEnv.getNotificationGrantSecret,
  });

  // The delivery path reads tokens through a port so the capability package
  // does not import data-core. This deployment has no app instrumentation, so
  // it wires the concrete queries here, exactly as the application does.
  const listTokens = new ListNotificationTokensQuery();
  const pushPreference = new GetNotificationPushPreferenceQuery();
  const deleteToken = new DeleteNotificationTokenCommand();
  configureNotificationTokenStore({
    tokensByUid: (uids) => listTokens.byUids(uids),
    pushEnabledUids: (uids) => pushPreference.pushEnabledUids(uids),
    deleteToken: (input) => deleteToken.execute(input),
  });
}

wireNotificationsCoreServerConfig();

/**
 * Register `@asol/data-core`'s runtime-config port.
 *
 * The main application does this from `src/instrumentation.ts`. An isolated
 * deployment has no instrumentation, so nothing configured the port here and
 * every route that reached a repository answered
 * `dataCoreRuntimeConfig: getServerRuntimeContext is not configured` — a 500 on
 * this account's real traffic while `/api/health` stayed 200, because health
 * touches no shard. The service deployed READY and was broken.
 *
 * It calls the application's single registrar rather than restating the port
 * here, so the six accounts and the main app cannot drift apart.
 */
// This deployment is Turso-only: it aliases better-sqlite3 to a stub that
// throws, so it must not let the environment pick a local data source.
registerDataCoreRuntimeConfigPorts({ forceRemoteDataSource: true });

export function createNotificationsRuntime(
  _config?: NotificationsRuntimeConfig,
): NotificationsRuntime {
  return {
    accountName: NOTIFICATIONS_DECLARATION.project,
    crypto: {
      readGrants: readGrantsFromRequestBody,
      maxGrantsPerRequest: MAX_GRANTS_PER_REQUEST,
    },
    delivery: { deliverGrants: deliverNotificationGrants },
    config: { serverEnv },
  };
}
