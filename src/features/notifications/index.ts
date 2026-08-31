/**
 * Notifications — the behavioural entry point.
 *
 * Cross-feature consumers use this door only. The module never imports a
 * consumer feature; consumer behaviour is attached through explicit public
 * registrations at composition boundaries.
 */

export { notifications, type NotificationsApi } from "./application/public/notifications";

export { NOTIFICATION_COMMAND_TYPES } from "./application/public/notification-commands";
export type {
  NotificationCommand,
  NotificationCommandResult,
  NotificationCommandResults,
  NotificationCommandType,
} from "./application/public/notification-commands";

export {
  NotificationError,
  NotificationErrorCodes,
  isNotificationError,
  type NotificationErrorCode,
} from "./domain/notification-error";

export type {
  NotificationCenterExtension,
  NotificationCenterExtensionContext,
} from "./application/public/notification-center-extension";
export type { NotificationStoredExtension } from "./application/notification-stored-extension";
export type {
  NotificationCenterSnapshot,
  NotificationDiagnostics,
  NotificationPermissionState,
  NotificationPermissionStateName,
  NotificationReceiveOutcome,
  OpenNotificationResult,
  ReceiveHandlers,
} from "./application/public/notification-public-types";

export * from "@asol/notifications-core";
export type { RetryOperationKind } from "./domain/notification-validation";
export {
  NOTIFICATION_TEST_SCENARIOS,
  NotificationTestScenarioIds,
  getNotificationTestScenario,
  type NotificationTestScenario,
  type NotificationTestScenarioId,
} from "@asol/notifications-core";

export {
  readNotificationGrants,
  NOTIFICATION_GRANTS_KEY,
  type NotificationGrantCarrier,
} from "@asol/notifications-core/grant-envelope";

export {
  getNotificationGrantDeliveryIdentity,
  setNotificationGrantDeliveryIdentity,
  type NotificationGrantDeliveryIdentity,
} from "./domain/notification-grant-delivery-context";

/* BEGIN GENERATED FEATURE DOOR EXPORTS */
/** Auto-maintained sealed-door re-exports. Do not edit by hand. */
/* END GENERATED FEATURE DOOR EXPORTS */
