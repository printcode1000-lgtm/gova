"use client";

/**
 * Notifications — the React surface.
 *
 * Separate from the behavioural entry point for one reason: importing a React
 * component pulls the whole presentation tree, and the behavioural API is
 * imported by API routes and by server services that must not carry it. Keeping
 * them apart means `@/features/notifications` stays a behaviour-only barrel and
 * a route handler that wants a type does not bundle a page.
 *
 * Everything here renders or is a hook. Behaviour still goes through
 * `notifications` from `@/features/notifications`; these components use the same
 * facade internally and add no second path into the module.
 */

// ---- controllers mounted once in the application shell ---------------------
export { NativePushController } from "./presentation/NativePushController";
export { WebPushController } from "./presentation/WebPushController";
export { NotificationOptInController } from "./presentation/NotificationOptInController";

// ---- screens ---------------------------------------------------------------
export { NotificationsPageContent } from "./presentation/NotificationsPageContent";

// ---- hooks -----------------------------------------------------------------
export { useNotifications, useNotificationBadge } from "./presentation/hooks/use-notifications";

/**
 * View-model helpers for a feature that renders stored notifications itself.
 *
 * Pure functions over `NotificationEntity[]`. Specialty chat uses them to build
 * its thread view without re-deriving the grouping rules the centre already
 * has.
 */
export {
  buildActivityGroups,
  buildLocalChatConversations,
  conversationMessages,
  findLocalChatConversation,
  type LocalChatConversation,
  type NotificationActivityGroup,
} from "./presentation/notification-center-model";
