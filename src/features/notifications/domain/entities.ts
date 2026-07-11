import type {
  NotificationCategory,
  NotificationChannel,
  NotificationContentSource,
  NotificationDeliveryStatus,
  NotificationLifecycleEvent,
  NotificationPlatform,
  NotificationPriority,
  NotificationSound,
  NotificationSyncState,
  NotificationTarget,
  NotificationType,
} from "./enums";

export type NotificationLocale = "ar" | "en";

export interface NotificationRoute {
  href: string;
  label?: string;
}

export interface NotificationTemplate {
  id: string;
  title: string;
  body: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  targets: NotificationTarget[];
  deepLink?: NotificationRoute;
  groupKey?: string;
  sound?: NotificationSound;
}

export interface NotificationEntity {
  id: string;
  uid: string;
  type: NotificationType;
  source: NotificationContentSource;
  templateId?: string;
  eventName?: string;
  title: string;
  body: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  targets: NotificationTarget[];
  route?: NotificationRoute;
  groupKey?: string;
  dedupeKey: string;
  sound: NotificationSound;
  status: NotificationDeliveryStatus;
  syncState: NotificationSyncState;
  readAt?: string;
  displayedAt?: string;
  openedAt?: string;
  dismissedAt?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface NotificationEvent {
  name: string;
  uid: string;
  dedupeKey: string;
  variables?: Record<string, string | number | boolean | null>;
  metadata?: Record<string, string | number | boolean | null>;
  route?: NotificationRoute;
  channels?: NotificationChannel[];
  targets?: NotificationTarget[];
  priority?: NotificationPriority;
}

export interface CustomNotificationInput {
  uid: string;
  notificationId?: string;
  dedupeKey: string;
  title: string;
  body: string;
  category: NotificationCategory;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  targets?: NotificationTarget[];
  route?: NotificationRoute;
  groupKey?: string;
  sound?: NotificationSound;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface TemplateNotificationInput {
  uid: string;
  notificationId?: string;
  templateId: string;
  dedupeKey: string;
  locale: NotificationLocale;
  variables?: Record<string, string | number | boolean | null>;
  route?: NotificationRoute;
  channels?: NotificationChannel[];
  targets?: NotificationTarget[];
  priority?: NotificationPriority;
  metadata?: Record<string, string | number | boolean | null>;
  eventName?: string;
}

export interface DeviceToken {
  id: string;
  uid: string;
  platform: NotificationPlatform;
  provider: string;
  deviceId: string;
  token: string;
  deviceLabel?: string;
  enabled: boolean;
  lastSeenAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisteredNotificationToken extends DeviceToken {
  deletedAt?: string | null;
}

export interface RegisterNotificationTokenInput {
  uid: string;
  platform: NotificationPlatform;
  provider: string;
  deviceId: string;
  token: string;
  deviceLabel?: string;
}

export interface DeleteNotificationTokenInput {
  uid: string;
  deviceId?: string;
  tokenId?: string;
}

export interface SendNotificationToUsersInput {
  actorUid?: string;
  uids: string[];
  templateId?: string;
  title?: string;
  body?: string;
  locale?: NotificationLocale;
  dedupeKey: string;
  variables?: Record<string, string | number | boolean | null>;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface NotificationTokenDeliveryResult {
  uid: string;
  tokenCount: number;
  status: "queued" | "no_tokens";
  providers?: Array<{
    provider: string;
    tokenCount: number;
    status: "queued" | "failed";
    message?: string;
  }>;
}

export interface SendNotificationToUsersResult {
  requested: number;
  results: NotificationTokenDeliveryResult[];
}

export interface NotificationVapidPublicConfig {
  enabled: boolean;
  publicKey: string;
}

export interface NotificationVapidAdminConfig extends NotificationVapidPublicConfig {
  subject: string;
  hasPrivateKey: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface NotificationVapidSecretConfig extends NotificationVapidAdminConfig {
  privateKey: string;
}

export interface SaveNotificationVapidInput {
  identity: {
    uid: string;
    phone: string;
  };
  enabled: boolean;
  subject: string;
}

export interface GenerateNotificationVapidInput {
  identity: {
    uid: string;
    phone: string;
  };
  subject: string;
}

export interface NotificationSettings {
  uid: string;
  locale: NotificationLocale;
  channels: Record<NotificationChannel, boolean>;
  targets: Record<NotificationTarget, boolean>;
  quietHours?: {
    enabled: boolean;
    start: string;
    end: string;
  };
  updatedAt: string;
}

export interface NotificationBadgeState {
  uid: string;
  unreadCount: number;
  updatedAt: string;
}

export interface NotificationAnalyticsEvent {
  id: string;
  uid: string;
  notificationId: string;
  event: NotificationLifecycleEvent;
  createdAt: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface NotificationOfflineOperation {
  id: string;
  uid: string;
  kind: "analytics" | "device_token" | "settings";
  payload: unknown;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}
