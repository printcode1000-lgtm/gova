/**
 * Notification channel constants and invariants.
 *
 * Runtime Invariants (§10.2):
 * - Channel IDs are frozen at _v4 (asol_general_v4, asol_orders_v4, etc.)
 * - Default sound is addressed by resource name custom_notification
 */

export interface NotificationChannel {
  id: string;
  name: string;
  description: string;
  /** 1 (min) .. 5 (max). Android only. */
  importance: 1 | 2 | 3 | 4 | 5;
  sound?: string;
  vibration?: boolean;
}

export const DEFAULT_CHANNEL_SOUND = "custom_notification.mp3";
export const DEFAULT_CHANNEL_ID = "asol_general_v4";

export const FROZEN_CHANNEL_IDS = [
  "asol_general_v4",
  "asol_orders_v4",
  "asol_chat_v4",
  "asol_urgent_v4",
  "asol_updates_v4",
  "asol_silent_v4",
] as const;

export type FrozenChannelId = (typeof FROZEN_CHANNEL_IDS)[number];

export const DEFAULT_CHANNELS: readonly NotificationChannel[] = [
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
    id: "asol_silent_v4",
    name: "أصول - إشعارات صامتة",
    description: "الإشعارات التي تصل بدون صوت أو اهتزاز",
    importance: 2,
    vibration: false,
  },
];
