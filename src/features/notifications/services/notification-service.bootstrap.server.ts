import 'server-only';

import { NotificationSendService } from './notification-send-service.server';
import { NotificationTokenService } from './notification-token-service.server';
import { NotificationVapidService } from './notification-vapid-service.server';

export const notificationTokenService = new NotificationTokenService();
export const notificationSendService = new NotificationSendService();
export const notificationVapidService = new NotificationVapidService();
