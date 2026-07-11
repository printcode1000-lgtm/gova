import {
  NotificationChannels,
  NotificationPriorities,
  NotificationSounds,
  NotificationTargets,
  type NotificationChannel,
  type NotificationPriority,
  type NotificationSound,
  type NotificationTarget,
} from "./enums";

export const DEFAULT_NOTIFICATION_CHANNELS: NotificationChannel[] = [
  NotificationChannels.InApp,
];

export const DEFAULT_NOTIFICATION_TARGETS: NotificationTarget[] = [
  NotificationTargets.Center,
  NotificationTargets.Badge,
  NotificationTargets.Popup,
];

export const DEFAULT_NOTIFICATION_PRIORITY: NotificationPriority =
  NotificationPriorities.Normal;

export const DEFAULT_NOTIFICATION_SOUND: NotificationSound = NotificationSounds.Default;

export const NOTIFICATION_CHANGED_EVENT = "gova:notifications:changed";
export const NOTIFICATION_POPUP_EVENT = "gova:notifications:popup";
