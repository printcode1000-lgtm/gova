import { configureNotificationsCoreServerConfig } from '@asol/notifications-core/server';
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
}
