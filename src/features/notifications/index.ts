/**
 * Notifications — the behavioural entry point.
 *
 * Cross-feature consumers use this door only. The module never imports a
 * consumer feature; consumer behaviour is attached through explicit public
 * registrations at composition boundaries.
 */

export { notifications, type NotificationsApi } from "./public/notifications";

export { NOTIFICATION_COMMAND_TYPES } from "./public/notification-commands";
export type {
  NotificationCommand,
  NotificationCommandResult,
  NotificationCommandResults,
  NotificationCommandType,
} from "./public/notification-commands";

export {
  NotificationError,
  NotificationErrorCodes,
  isNotificationError,
  type NotificationErrorCode,
} from "./domain/notification-error";

export type {
  NotificationCenterExtension,
  NotificationCenterExtensionContext,
} from "./public/notification-center-extension";
export type { NotificationStoredExtension } from "./public/notification-stored-extension";
export type {
  NotificationCenterSnapshot,
  NotificationDiagnostics,
  NotificationPermissionState,
  NotificationPermissionStateName,
  NotificationReceiveOutcome,
  OpenNotificationResult,
  ReceiveHandlers,
} from "./public/notification-public-types";

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
} from "./domain/notification-grant-envelope";

export {
  getNotificationGrantDeliveryIdentity,
  setNotificationGrantDeliveryIdentity,
  type NotificationGrantDeliveryIdentity,
} from "./domain/notification-grant-delivery-context";

/* BEGIN GENERATED FEATURE DOOR EXPORTS */
/** Auto-maintained sealed-door re-exports. Do not edit by hand. */
/* END GENERATED FEATURE DOOR EXPORTS */
