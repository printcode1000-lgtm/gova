import type {
  AuthenticatedNotificationTestInput,
  BroadcastNotificationInput,
  BroadcastNotificationResult,
  BroadcastRecipientsResult,
  CustomNotificationInput,
  DeviceToken,
  NotificationEntity,
  NotificationEvent,
  NotificationTestResult,
  TemplateNotificationInput,
} from "../domain/entities";
import type { RetryOperationKind } from "../domain/notification-validation";
import type { NotificationCenterExtension } from "./notification-center-extension";
import type {
  NotificationCenterSnapshot,
  NotificationDiagnostics,
  NotificationPermissionState,
  NotificationReceiveOutcome,
  OpenNotificationResult,
  ReceiveHandlers,
} from "./notification-public-types";

/**
 * Every operation the notification module supports, as data.
 *
 * The command form exists so a caller can be handed one narrow, inspectable
 * shape — a diagnostics screen, a test harness, a future queue — instead of a
 * pile of imported functions. `notifications.execute` is exhaustive over this
 * union, so adding a case here is a compile error until it is handled.
 *
 * Anything not in this union is not an operation this module has. `execute`
 * fails closed on an unknown `type` rather than ignoring it.
 */
export type NotificationCommand =
  | { type: "initialize"; payload: { uid: string; phone: string; handlers?: ReceiveHandlers } }
  | { type: "registerDevice"; payload: { uid: string; phone: string } }
  | { type: "enableDevice"; payload: { uid: string; phone: string } }
  | { type: "unregisterDevice"; payload: { uid: string; phone: string } }
  | { type: "refreshDeviceLocale"; payload: { uid: string; phone: string } }
  | { type: "listDevices"; payload: { uid: string } }
  | { type: "requestPermission"; payload?: { uid?: string; phone?: string } }
  | { type: "getPermissionState" }
  | { type: "openPermissionSettings" }
  | { type: "sendLocal"; payload: NotificationEntity }
  | { type: "publishTemplate"; payload: TemplateNotificationInput }
  | { type: "publishCustom"; payload: CustomNotificationInput }
  | { type: "publishEvent"; payload: { event: NotificationEvent; locale?: "ar" | "en" } }
  | { type: "sendPush"; payload: BroadcastNotificationInput }
  | { type: "listPushRecipients"; payload: { uid: string; phone: string } }
  | { type: "receive"; payload: unknown }
  | { type: "importDelivered"; payload?: { uid?: string } }
  | { type: "createChannels" }
  | { type: "clearLocalInbox" }
  | { type: "synchronizeNotificationCenter"; payload: { uid: string } }
  | { type: "list"; payload: { uid: string } }
  | { type: "getUnreadCount"; payload: { uid: string } }
  | { type: "markRead"; payload: { uid: string; notificationId: string } }
  | { type: "markManyRead"; payload: { uid: string; notificationIds: readonly string[] } }
  | { type: "markAllRead"; payload: { uid: string } }
  | { type: "dismiss"; payload: { uid: string; notificationId: string } }
  | { type: "openNotification"; payload: { uid: string; notificationId: string } }
  | {
      type: "patchMetadata";
      payload: {
        uid: string;
        notificationId: string;
        metadata: NotificationEntity["metadata"];
      };
    }
  | {
      type: "enqueueRetry";
      payload: { uid: string; kind: RetryOperationKind; id: string; payload: unknown };
    }
  | { type: "registerCenterExtension"; payload: NotificationCenterExtension }
  | { type: "executeTestScenario"; payload: AuthenticatedNotificationTestInput }
  | { type: "getDiagnostics"; payload?: { uid?: string } };

export type NotificationCommandType = NotificationCommand["type"];

/**
 * The result each command resolves to, keyed by command type.
 *
 * Every key here must exist in `NotificationCommand`, and vice versa. The two
 * static checks at the bottom of this file make a mismatch a compile error, so
 * `execute`'s return type cannot drift away from what it actually returns.
 */
export interface NotificationCommandResults {
  initialize: void;
  registerDevice: DeviceToken | null;
  enableDevice: void;
  unregisterDevice: void;
  refreshDeviceLocale: void;
  listDevices: DeviceToken[];
  requestPermission: NotificationPermission | "unsupported";
  getPermissionState: NotificationPermissionState;
  openPermissionSettings: boolean;
  sendLocal: NotificationEntity;
  publishTemplate: NotificationEntity;
  publishCustom: NotificationEntity;
  publishEvent: NotificationEntity | null;
  sendPush: BroadcastNotificationResult;
  listPushRecipients: BroadcastRecipientsResult;
  receive: NotificationReceiveOutcome;
  importDelivered: void;
  createChannels: void;
  clearLocalInbox: void;
  synchronizeNotificationCenter: NotificationCenterSnapshot;
  list: NotificationEntity[];
  getUnreadCount: number;
  markRead: void;
  markManyRead: void;
  markAllRead: void;
  dismiss: void;
  openNotification: OpenNotificationResult;
  patchMetadata: void;
  enqueueRetry: void;
  registerCenterExtension: () => void;
  executeTestScenario: NotificationTestResult;
  getDiagnostics: NotificationDiagnostics;
}

export type NotificationCommandResult<TCommand extends NotificationCommand> =
  NotificationCommandResults[TCommand["type"]];

/**
 * Static proof that the command union and the result map describe the same set.
 *
 * Without these, a command could be added with no result entry (making
 * `execute` return `undefined` typed as something) or a result entry could
 * outlive its command.
 */
type MissingResultFor = Exclude<NotificationCommandType, keyof NotificationCommandResults>;
type ResultWithoutCommand = Exclude<keyof NotificationCommandResults, NotificationCommandType>;
type AssertNever<T extends never> = T;
export type CommandResultMapIsComplete = [
  AssertNever<MissingResultFor>,
  AssertNever<ResultWithoutCommand>,
];

/** Every command type, for guards and tests that must stay exhaustive. */
export const NOTIFICATION_COMMAND_TYPES = [
  "initialize",
  "registerDevice",
  "enableDevice",
  "unregisterDevice",
  "refreshDeviceLocale",
  "listDevices",
  "requestPermission",
  "getPermissionState",
  "openPermissionSettings",
  "sendLocal",
  "publishTemplate",
  "publishCustom",
  "publishEvent",
  "sendPush",
  "listPushRecipients",
  "receive",
  "importDelivered",
  "createChannels",
  "clearLocalInbox",
  "synchronizeNotificationCenter",
  "list",
  "getUnreadCount",
  "markRead",
  "markManyRead",
  "markAllRead",
  "dismiss",
  "openNotification",
  "patchMetadata",
  "enqueueRetry",
  "registerCenterExtension",
  "executeTestScenario",
  "getDiagnostics",
] as const satisfies readonly NotificationCommandType[];

/** The runtime list must also be complete, not merely a subset of valid names. */
type ListedCommandType = (typeof NOTIFICATION_COMMAND_TYPES)[number];
export type CommandListIsComplete = AssertNever<
  Exclude<NotificationCommandType, ListedCommandType>
>;
