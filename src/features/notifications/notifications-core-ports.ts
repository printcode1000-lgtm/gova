import {
  configureNotificationsCoreServerConfig,
  configureNotificationTokenStore,
} from '@asol/notifications-core/server';
import {
  DeleteNotificationTokenCommand,
  GetNotificationPushPreferenceQuery,
  ListNotificationTokensQuery,
} from '@asol/data-core/notifications';
import {
  getApnsServerConfig,
  getFirebaseAdminServiceAccount,
  getNotificationGrantSecret,
  getWebPushServerConfig,
} from '@/core/config/server-env/server-env.values.turso-env';

/**
 * Registers application env getters into `@asol/notifications-core`.
 * Called from the server composition root (and notifications composition).
 */
export function registerNotificationsCorePorts(): void {
  configureNotificationsCoreServerConfig({
    getWebPushServerConfig,
    getFirebaseAdminServiceAccount,
    getApnsServerConfig,
    getNotificationGrantSecret,
  });

  // Delivery names three persistence operations as a port so the capability
  // package no longer imports data-core — the edge that closed a package cycle.
  // The concrete queries are wired here, at the composition boundary.
  const listTokens = new ListNotificationTokensQuery();
  const pushPreference = new GetNotificationPushPreferenceQuery();
  const deleteToken = new DeleteNotificationTokenCommand();
  configureNotificationTokenStore({
    tokensByUid: (uids) => listTokens.byUids(uids),
    pushEnabledUids: (uids) => pushPreference.pushEnabledUids(uids),
    deleteToken: (input) => deleteToken.execute(input),
  });
}
