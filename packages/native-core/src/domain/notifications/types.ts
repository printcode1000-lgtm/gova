export interface PushToken {
  value: string;
  platform: "android" | "ios" | "web";
  provider: "fcm" | "apns" | "web-push";
}

export interface NotificationPayload {
  id: string;
  title: string;
  body: string;
  data: Record<string, string>;
  foreground: boolean;
  tag?: string;
  channelId?: string;
}

export interface NotificationInboxRecord {
  recordId: string;
  uid: string;
  notificationId: string;
  dedupeKey: string;
  channelId: string;
  createdAt: string;
  receivedAt: number;
  payload: NotificationPayload;
}

export interface NotificationInboxTap {
  recordId: string;
  uid: string;
  notificationId: string;
  record?: NotificationInboxRecord;
}

export type NotificationTapListener = (tap: NotificationInboxTap) => void;
export type PushTokenListener = (token: PushToken) => void;
export type NotificationListener = (payload: NotificationPayload) => void;
export type NotificationActionListener = (payload: NotificationPayload) => void;

export interface LocalNotificationSchedule {
  id: number;
  title: string;
  body: string;
  at?: Date;
  channelId?: string;
  sound?: string;
  badge?: number;
  data?: Record<string, string>;
}
