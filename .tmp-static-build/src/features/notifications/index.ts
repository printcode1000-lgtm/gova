/**
 * Notifications — the behavioural entry point.
 *
 * ```ts
 * import { notifications } from "@/features/notifications";
 *
 * await notifications.execute({ type: "markAllRead", payload: { uid } });
 * await notifications.markAllRead({ uid });      // the same use case
 * ```
 *
 * This file exports **one runtime object**: `notifications`. Everything else it
 * exports is a type, a frozen enum, or a pure helper. No service, repository,
 * adapter, transport, bus, builder, template loader, or React component is
 * reachable from here — a consumer that can reach an implementation object can
 * hold it, mutate it, and depend on its shape, which is exactly what this module
 * spent its refactor removing.
 *
 * ## The other entry points
 *
 * There are four in total, and each exists because it cannot be merged into
 * this one:
 *
 * | Entry point | Why it is separate |
 * |---|---|
 * | `@/features/notifications` | The client/application behaviour. |
 * | `@/features/notifications/ui` | React components and hooks. Importing them here would drag the whole presentation tree — and React itself — into every server route that only wants a type. |
 * | `@/features/notifications/server` | Everything behind it imports `server-only`; pulling that into a client component is a build error, not a preference. |
 * | `@/features/notifications/contracts` | Types only. The data-access repositories need the vocabulary without the behaviour, and the notifications microservice is built by walking imports — a repository that reached `server.ts` would drag the broadcast and users code into a deployment that must not contain them. |
 *
 * A fifth path, `@/features/notifications/service-runtime`, exists for the
 * notifications microservice alone and is not importable from `src`.
 *
 * Importing anything else — `domain/*`, `application/*`, `infrastructure/*`,
 * `services/*`, `presentation/*`, `public/*`, `shared/*` — fails
 * `npm run architecture:check` and `npm run test:notifications`.
 */

// ---- the API: one runtime object -------------------------------------------
export { notifications, type NotificationsApi } from "./public/notifications";

// ---- the command surface ---------------------------------------------------
export { NOTIFICATION_COMMAND_TYPES } from "./public/notification-commands";
export type {
  NotificationCommand,
  NotificationCommandResult,
  NotificationCommandResults,
  NotificationCommandType,
} from "./public/notification-commands";

// ---- typed failures --------------------------------------------------------
export {
  NotificationError,
  NotificationErrorCodes,
  isNotificationError,
  type NotificationErrorCode,
} from "./domain/notification-error";

// ---- public result and input types -----------------------------------------
export type {
  NotificationCenterExtension,
  NotificationCenterExtensionContext,
} from "./public/notification-center-extension";
export type {
  NotificationCenterSnapshot,
  NotificationDiagnostics,
  NotificationPermissionState,
  NotificationPermissionStateName,
  NotificationReceiveOutcome,
  OpenNotificationResult,
  ReceiveHandlers,
} from "./public/notification-public-types";

// ---- the vocabulary --------------------------------------------------------
// Domain types and their constant enums. No adapter, repository, or transport
// type appears here, and nothing exported is mutable state.
export * from "./domain/enums";
export * from "./domain/entities";
export type { RetryOperationKind } from "./domain/notification-validation";
export {
  NOTIFICATION_TEST_SCENARIOS,
  NotificationTestScenarioIds,
  getNotificationTestScenario,
  type NotificationTestScenario,
  type NotificationTestScenarioId,
} from "./domain/notification-test-scenarios";

/**
 * The grant envelope.
 *
 * A pure reader over an API response body, exported because the browser bridge
 * runs on every response and cannot afford a round trip through a use case. It
 * holds no state and reaches nothing.
 */
export {
  readNotificationGrants,
  NOTIFICATION_GRANTS_KEY,
  type NotificationGrantCarrier,
} from "./domain/notification-grant-envelope";
