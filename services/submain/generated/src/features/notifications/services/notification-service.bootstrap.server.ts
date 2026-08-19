import 'server-only';

import { NotificationTokenService } from './notification-token-service.server';
import { NotificationBroadcastService } from './notification-broadcast-service.server';

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
