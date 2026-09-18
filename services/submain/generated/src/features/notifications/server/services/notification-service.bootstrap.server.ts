import 'server-only';

import { NotificationTokenService } from './notification-token-service.server';
import { NotificationBroadcastService } from './notification-broadcast-service.server';
import { NotificationSelfTestService } from './notification-self-test.service.server';

/**
 * Server services the *main app* uses.
 *
 * `NotificationSendService` is deliberately absent. The main app never sends —
 * it signs grants — and exporting a ready-made sender here would pull the FCM,
 * APNs, and Web Push providers into its bundle for code that can never run.
 * The notifications service constructs its own instance in its route.
 */
export const notificationTokenService = new NotificationTokenService();
export const notificationBroadcastService = new NotificationBroadcastService();
export const notificationSelfTestService = new NotificationSelfTestService();

/**
 * The native sender's two session-bound services. Re-exported, not rebuilt, so
 * the application and an isolated composition root share one instance each.
 */
export { notificationRecipientTokensService } from './notification-recipient-tokens.service.server';
export { mobilePushUnlockService } from './mobile-push-unlock.service.server';

/**
 * The broadcast services refuse everyone until a composition root says who the
 * administrator is (fail closed). Every root that serves broadcast must call it.
 */
export { configureNotificationAdminAuthorization } from '../notification-admin-authorization';
