/**
 * Notifications contract — push and local.
 */

export interface PushToken {
  value: string;
  platform: "android" | "ios" | "web";
  provider: "fcm" | "apns" | "web-push";
}

/** Normalized notification payload, identical across platforms. */
export interface NotificationPayload {
  id: string;
  title: string;
  body: string;
  /** Free-form data the sender attached. */
  data: Record<string, string>;
  /** True when the app was in the foreground at delivery time. */
  foreground: boolean;
}

export type PushTokenListener = (token: PushToken) => void;
export type NotificationListener = (payload: NotificationPayload) => void;
export type NotificationActionListener = (
  payload: NotificationPayload,
) => void;

export interface LocalNotificationSchedule {
  /** Stable numeric id so the caller can cancel it later. */
  id: number;
  title: string;
  body: string;
  /** Absolute delivery time. Omit to deliver immediately. */
  at?: Date;
  /** Android channel id. Defaults to the general channel. */
  channelId?: string;
  /** Custom sound file name, without a path. */
  sound?: string;
  /** Badge count to display alongside the notification. */
  badge?: number;
  /** Extra data returned when the user taps the notification. */
  data?: Record<string, string>;
}

export interface NotificationChannel {
  id: string;
  name: string;
  description: string;
  /** 1 (min) .. 5 (max). Android only. */
  importance: 1 | 2 | 3 | 4 | 5;
  sound?: string;
  vibration?: boolean;
}

/** Sound file bundled in the Android resources. */
export const DEFAULT_CHANNEL_SOUND = "custom_notification.mp3";

/**
 * Channels the application registers on Android.
 *
 * Names and ids are user-visible in Android system settings and are matched
 * by already-installed clients — changing them creates a duplicate channel
 * and silently drops the user's existing preference.
 */
export const DEFAULT_CHANNELS: NotificationChannel[] = [
  {
    id: "asol_general_v2",
    name: "ASOL - الإشعارات العامة",
    description: "الإشعارات العامة من أصول",
    importance: 4,
    vibration: true,
    sound: DEFAULT_CHANNEL_SOUND,
  },
  {
    id: "asol_orders_v2",
    name: "ASOL - الطلبات",
    description: "تحديثات الطلبات والشحن والإرجاع",
    importance: 4,
    vibration: true,
    sound: DEFAULT_CHANNEL_SOUND,
  },
  {
    id: "asol_chat_v2",
    name: "ASOL - المحادثات",
    description: "الرسائل والمحادثات الجديدة",
    importance: 4,
    vibration: true,
    sound: DEFAULT_CHANNEL_SOUND,
  },
  {
    id: "asol_urgent_v2",
    name: "ASOL - التنبيهات المهمة",
    description: "التنبيهات العاجلة والمهمة",
    importance: 5,
    vibration: true,
    sound: DEFAULT_CHANNEL_SOUND,
  },
  {
    id: "asol_updates_v2",
    name: "ASOL - التحديثات",
    description: "إشعارات التحديثات العامة من أصول",
    importance: 4,
    vibration: true,
    sound: DEFAULT_CHANNEL_SOUND,
  },
];

export const DEFAULT_CHANNEL_ID = "asol_general_v2";
