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
  /** Android tray tag, preserved so startup import keeps the push identity. */
  tag?: string;
  /** Android channel used by the OS, preserved for faithful tray import. */
  channelId?: string;
}

/**
 * One record from the Android device-local notification inbox.
 *
 * The inbox is an application-private, encrypted, on-device buffer that the
 * native push service writes to *before* it posts a system notification, for
 * the window in which the WebView — and therefore IndexedDB — cannot run at
 * all. It is a handoff, never a history: a record is deleted the moment the web
 * layer confirms it reached IndexedDB, and nothing about it is ever sent
 * anywhere.
 *
 * `payload` is the complete original message, shaped exactly like a live push,
 * so the same mapper handles both and a background delivery cannot lose fields
 * a foreground one keeps.
 */
export interface NotificationInboxRecord {
  /** Stable, opaque id. The unit of acknowledgement. */
  recordId: string;
  /** The user this push was addressed to. */
  uid: string;
  notificationId: string;
  dedupeKey: string;
  channelId: string;
  /** Sender-declared creation time, ISO-8601. */
  createdAt: string;
  /** When the device received it, epoch milliseconds. */
  receivedAt: number;
  payload: NotificationPayload;
}

/** A notification tap the process was launched or resumed with. */
export interface NotificationInboxTap {
  /** Empty when there is no pending tap. */
  recordId: string;
  /** The uid the tapped record belongs to. */
  uid: string;
  /**
   * The stored notification the tap refers to.
   *
   * Carried by the launch Intent rather than read from the record, so a tap on
   * a tray entry whose record was already imported and acknowledged still
   * identifies which notification to mark read.
   */
  notificationId: string;
  /** The record itself, when it is still pending. */
  record?: NotificationInboxRecord;
}

export type NotificationTapListener = (tap: NotificationInboxTap) => void;

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
 *
 * The ids are restated in `features/notifications/domain/notification-sound.ts`,
 * which decides *which* of them a notification uses; this module only creates
 * them. `notification-sound-contract.test.ts` fails the build if the two
 * lists drift.
 */
export const DEFAULT_CHANNELS: NotificationChannel[] = [
  {
    id: "asol_general_v4",
    name: "أصول - الإشعارات العامة (نغمة مخصصة)",
    description: "الإشعارات العامة من أصول",
    importance: 4,
    vibration: true,
    sound: DEFAULT_CHANNEL_SOUND,
  },
  {
    id: "asol_orders_v4",
    name: "أصول - الطلبات (نغمة مخصصة)",
    description: "تحديثات الطلبات والشحن والإرجاع",
    importance: 4,
    vibration: true,
    sound: DEFAULT_CHANNEL_SOUND,
  },
  {
    id: "asol_chat_v4",
    name: "أصول - المحادثات (نغمة مخصصة)",
    description: "الرسائل والمحادثات الجديدة",
    importance: 4,
    vibration: true,
    sound: DEFAULT_CHANNEL_SOUND,
  },
  {
    id: "asol_urgent_v4",
    name: "أصول - التنبيهات العاجلة (نغمة مخصصة)",
    description: "التنبيهات العاجلة والمهمة",
    importance: 5,
    vibration: true,
    sound: DEFAULT_CHANNEL_SOUND,
  },
  {
    id: "asol_updates_v4",
    name: "أصول - التحديثات (نغمة مخصصة)",
    description: "إشعارات التحديثات العامة من أصول",
    importance: 4,
    vibration: true,
    sound: DEFAULT_CHANNEL_SOUND,
  },
  {
    // Importance 2 (LOW) is what makes this channel silent: Android plays a
    // channel's sound from importance 3 upward, and a channel created without
    // an explicit sound still inherits the *system* sound — omitting the file
    // is not enough on its own.
    id: "asol_silent_v4",
    name: "أصول - إشعارات صامتة",
    description: "الإشعارات التي تصل بدون صوت أو اهتزاز",
    importance: 2,
    vibration: false,
  },
];

export const DEFAULT_CHANNEL_ID = "asol_general_v4";
