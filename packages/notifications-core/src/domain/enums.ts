export const NotificationTypes = {
  Template: "template",
  Custom: "custom",
  Event: "event",
} as const;

export type NotificationType = (typeof NotificationTypes)[keyof typeof NotificationTypes];

export const NotificationCategories = {
  Orders: "orders",
  Chat: "chat",
  Payment: "payment",
  Offers: "offers",
  System: "system",
} as const;

export type NotificationCategory =
  (typeof NotificationCategories)[keyof typeof NotificationCategories];

export const NotificationPriorities = {
  Low: "low",
  Normal: "normal",
  High: "high",
  Critical: "critical",
} as const;

export type NotificationPriority =
  (typeof NotificationPriorities)[keyof typeof NotificationPriorities];

export const NotificationChannels = {
  InApp: "in_app",
  WebPush: "web_push",
  AndroidPush: "android_push",
  IosPush: "ios_push",
} as const;

export type NotificationChannel =
  (typeof NotificationChannels)[keyof typeof NotificationChannels];

export const NotificationTargets = {
  Center: "center",
  Badge: "badge",
  Popup: "popup",
  Home: "home",
  Orders: "orders",
  Chat: "chat",
  BuyerDashboard: "buyer_dashboard",
  SellerDashboard: "seller_dashboard",
  AdminDashboard: "admin_dashboard",
} as const;

export type NotificationTarget = (typeof NotificationTargets)[keyof typeof NotificationTargets];

export const NotificationPlatforms = {
  Web: "web",
  Android: "android",
  Ios: "ios",
} as const;

export type NotificationPlatform =
  (typeof NotificationPlatforms)[keyof typeof NotificationPlatforms];

export const NotificationContentSources = {
  Template: "template",
  Custom: "custom",
  Event: "event",
} as const;

export type NotificationContentSource =
  (typeof NotificationContentSources)[keyof typeof NotificationContentSources];

export const NotificationLifecycleEvents = {
  Sent: "sent",
  Delivered: "delivered",
  Received: "received",
  Displayed: "displayed",
  Opened: "opened",
  Clicked: "clicked",
  Dismissed: "dismissed",
  Failed: "failed",
} as const;

export type NotificationLifecycleEvent =
  (typeof NotificationLifecycleEvents)[keyof typeof NotificationLifecycleEvents];

export const NotificationDeliveryStatuses = {
  Pending: "pending",
  Delivered: "delivered",
  Failed: "failed",
} as const;

export type NotificationDeliveryStatus =
  (typeof NotificationDeliveryStatuses)[keyof typeof NotificationDeliveryStatuses];

export const NotificationSyncStates = {
  Synced: "synced",
  Pending: "pending",
  Failed: "failed",
} as const;

export type NotificationSyncState =
  (typeof NotificationSyncStates)[keyof typeof NotificationSyncStates];

export const NotificationSounds = {
  Default: "default",
  Silent: "silent",
  Urgent: "urgent",
} as const;

export type NotificationSound = (typeof NotificationSounds)[keyof typeof NotificationSounds];
