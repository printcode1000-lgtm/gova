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
import type { NotificationTestScenarioId } from "./notification-test-scenarios";

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
  /** UI language of this device; push text is built in it. */
  locale?: NotificationLocale;
  deviceLabel?: string;
  enabled: boolean;
  lastSeenAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisteredNotificationToken extends DeviceToken {
  deletedAt?: string | null;
}

/**
 * A registration as its owning account may see it.
 *
 * Deliberately not `DeviceToken`: the push token is a delivery credential, and
 * a listing exists to let a user recognise and revoke a device, which the
 * device id, platform and timestamps already answer.
 */
export interface AccountDeviceSummary {
  id: string;
  deviceId: string;
  platform: NotificationPlatform;
  provider: string;
  locale?: NotificationLocale;
  deviceLabel?: string;
  enabled: boolean;
  lastSeenAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountDevicesResult {
  devices: AccountDeviceSummary[];
}

/** A push the account sends to its own devices to prove delivery works. */
export interface SelfTestNotificationInput {
  identity: {
    uid: string;
    phone: string;
  };
  requestId?: string;
  locale?: NotificationLocale;
}

export interface SelfTestNotificationResult extends SendNotificationToUsersResult {
  /** Signed grant for the caller's own client to deliver. */
  notificationGrants?: string[];
  channelId: string;
  dedupeKey: string;
}

export interface NotificationChatPreferences {
  specialtyRequestsEnabled: boolean;
  productConversationsEnabled: boolean;
}

export type NotificationChatPreferenceChanges =
  Partial<NotificationChatPreferences>;

/**
 * The account-wide master switch. Distinct from `NotificationChatPreferences`
 * on purpose: those gate whether other users may start a specialty request or
 * a conversation, while this gates every send this account would otherwise
 * receive, of any kind. `false` never removes a registration or a token — it
 * is checked at fan-out time, in `NotificationSendService.sendToUsersLocally`,
 * so re-enabling needs no device to re-register anything.
 */
export interface NotificationDeliveryPreference {
  pushEnabled: boolean;
}

export interface RegisterNotificationTokenInput {
  uid: string;
  phone: string;
  platform: NotificationPlatform;
  provider: string;
  deviceId: string;
  token: string;
  locale?: NotificationLocale;
  deviceLabel?: string;
}

export interface DeleteNotificationTokenInput {
  uid: string;
  phone?: string;
  deviceId?: string;
  tokenId?: string;
}

export type NotificationVariables = Record<
  string,
  string | number | boolean | null
>;

export interface SendNotificationToUsersInput {
  actorUid?: string;
  uids: string[];
  templateId?: string;
  title?: string;
  body?: string;
  /** Fallback language for devices that never reported one. */
  locale?: NotificationLocale;
  dedupeKey: string;
  variables?: NotificationVariables;
  /**
   * Variables that differ per language — a formatted amount, a category name.
   * They are merged over `variables` for the language of each device group, so
   * one send can address Arabic and English readers correctly.
   */
  variablesByLocale?: Partial<Record<NotificationLocale, NotificationVariables>>;
  metadata?: Record<string, string | number | boolean | null>;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  sound?: NotificationSound;
  route?: NotificationRoute;
  /** Per-language override of the deep link label. */
  routeByLocale?: Partial<Record<NotificationLocale, NotificationRoute>>;
}

export interface NotificationTokenDeliveryResult {
  uid: string;
  tokenCount: number;
  /**
   * `granted` is reported by the main app, which authorises a send without
   * performing it. Every other value comes from the notifications service,
   * which is the only side that talks to a provider.
   */
  status:
    | "sent"
    | "partial"
    | "queued"
    | "failed"
    | "no_tokens"
    | "granted"
    | "muted";
  providers?: Array<{
    provider: string;
    locale?: NotificationLocale;
    tokenCount: number;
    status: "sent" | "partial" | "queued" | "failed";
    successCount?: number;
    failureCount?: number;
    invalidTokenIds?: string[];
    message?: string;
  }>;
}

export interface SendNotificationToUsersResult {
  requested: number;
  results: NotificationTokenDeliveryResult[];
}

export interface BroadcastRecipient {
  uid: string;
  phoneMasked: string;
  emailMasked?: string;
  tokenCount: number;
  platforms: NotificationPlatform[];
  providers: string[];
  lastSeenAt?: string;
}

export interface BroadcastRecipientsResult {
  userCount: number;
  tokenCount: number;
  providerCounts: Record<string, number>;
  platformCounts: Record<string, number>;
  recipients: BroadcastRecipient[];
}

export interface BroadcastNotificationInput {
  identity: {
    uid: string;
    phone: string;
  };
  requestId?: string;
  title: string;
  body: string;
  uids?: string[];
  sendToAll?: boolean;
}

export interface BroadcastNotificationResult extends SendNotificationToUsersResult {
  recipientMode: "all" | "selected";
  /** Signed grant for the admin's browser to deliver. */
  notificationGrants?: string[];
}

export interface NotificationTestInput {
  identity: {
    uid: string;
    phone: string;
  };
  requestId?: string;
  scenarioId: NotificationTestScenarioId;
  title: string;
  body: string;
  routeHref?: string;
}

export interface AuthenticatedNotificationTestInput
  extends Omit<NotificationTestInput, "identity"> {
  identity: NotificationTestInput["identity"] & {
    /** Used only as the signed request header; never serialized in the body. */
    sessionToken: string;
  };
}

export interface NotificationTestResult extends SendNotificationToUsersResult {
  notificationGrants?: string[];
  scenarioId: NotificationTestScenarioId;
  channelId: string;
  dedupeKey: string;
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
  kind: "analytics" | "device_token" | "settings" | "chat_receipt";
  payload: unknown;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}

export interface SpecialtyChatReceiptOperation {
  capability: string;
  targetMessageId: string;
  status: "received" | "read";
  notificationId: string;
}
