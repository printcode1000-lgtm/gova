import { NOTIFICATIONS_DECLARATION } from '@asol/account-declarations/notifications';
import * as serverEnv from '@/core/config/server-env';
import {
  deliverNotificationGrants,
  readGrantsFromRequestBody,
  MAX_GRANTS_PER_REQUEST,
} from '@/features/notifications/service-runtime';

export interface NotificationsRuntimeConfig {
  /** Overrides the environment. Used by tests; production reads the declaration's keys. */
  env?: NodeJS.ProcessEnv;
}

export interface NotificationsRuntime {
  accountName: string;
  /**
   * Exactly the three things the send route needs.
   *
   * `service-runtime` is the only notification path this deployment may reach: going
   * further pulls the users repository onto an account that must never hold it, and the
   * mirror would carry it there. Naming the three here means a route cannot widen that
   * by adding an import — it has nothing else to import from.
   */
  deliverNotificationGrants: typeof deliverNotificationGrants;
  readGrantsFromRequestBody: typeof readGrantsFromRequestBody;
  MAX_GRANTS_PER_REQUEST: typeof MAX_GRANTS_PER_REQUEST;
  serverEnv: typeof serverEnv;
}

/**
 * Rule 4 — validates against `NOTIFICATIONS_DECLARATION.requiredEnv`, not against names
 * typed here, so the check cannot disagree with what the deploy pushes.
 *
 * This account's required set is wider than the other three: besides its Turso pair it
 * needs `ASOL_NOTIFICATION_GRANT_SECRET` and the VAPID keys, because verifying a grant
 * and signing a web push are both done here.
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

/**
 * Layer 2 for the notifications account.
 *
 * Validation is not performed in this factory: it runs during `next build` as well as per
 * request, and build time has no account credentials.
 */
export function createNotificationsRuntime(
  _config?: NotificationsRuntimeConfig,
): NotificationsRuntime {
  return {
    accountName: NOTIFICATIONS_DECLARATION.project,
    deliverNotificationGrants,
    readGrantsFromRequestBody,
    MAX_GRANTS_PER_REQUEST,
    serverEnv,
  };
}
