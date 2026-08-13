/**
 * Notifications facade — push and local under one namespace, each half
 * implemented by its own single-responsibility class.
 */

import { localNotifications } from "./local-notifications";
import { pushNotifications } from "./push-notifications";

export const notifications = {
  /** Remote transport: FCM on Android, APNs on iOS. */
  push: pushNotifications,
  /** Device-scheduled notifications and badging. */
  local: localNotifications,
} as const;

export {
  pushNotifications,
  PushNotificationsModule,
} from "./push-notifications";
export {
  localNotifications,
  LocalNotificationsModule,
} from "./local-notifications";
export {
  DEFAULT_CHANNEL_ID,
  DEFAULT_CHANNELS,
  type LocalNotificationSchedule,
  type NotificationActionListener,
  type NotificationChannel,
  type NotificationInboxRecord,
  type NotificationInboxTap,
  type NotificationListener,
  type NotificationPayload,
  type NotificationTapListener,
  type PushToken,
  type PushTokenListener,
} from "./types";
