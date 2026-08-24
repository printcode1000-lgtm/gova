"use client";

/** Notifications React public door. */
export { NativePushController } from "./presentation/NativePushController";
export { WebPushController } from "./presentation/WebPushController";
export { NotificationOptInController } from "./presentation/NotificationOptInController";
export {
  NotificationRuntimeProvider,
  type NotificationRuntimeIdentity,
  type NotificationLoginCompleted,
} from "./presentation/NotificationRuntimeProvider";

export { NotificationsPageContent } from "./presentation/NotificationsPageContent";

export { useNotifications, useNotificationBadge } from "./presentation/hooks/use-notifications";

export {
  buildActivityGroups,
  buildLocalChatConversations,
  conversationMessages,
  findLocalChatConversation,
  type LocalChatConversation,
  type NotificationActivityGroup,
} from "./presentation/notification-center-model";
