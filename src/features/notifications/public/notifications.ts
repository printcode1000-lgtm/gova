"use client";

import { NotificationError, NotificationErrorCodes } from "../domain/notification-error";
import {
  NOTIFICATION_COMMAND_TYPES,
  type NotificationCommand,
  type NotificationCommandResult,
  type NotificationCommandResults,
  type NotificationCommandType,
} from "./notification-commands";
import { notificationsFacade, type NotificationsFacade } from "./notification-facade";
import {
  registerNotificationStoredExtension,
  type NotificationStoredExtension,
} from "./notification-stored-extension";

/**
 * The notification module's public API.
 *
 * Two equivalent ways in, and no third:
 *
 * ```ts
 * await notifications.markAllRead({ uid });
 * await notifications.execute({ type: "markAllRead", payload: { uid } });
 * ```
 *
 * `execute` is the command form — one entry point that takes the whole
 * operation as data. The named methods are the same use cases spelled out, for
 * call sites where a literal reads better. Both go through the same facade, so
 * there is one implementation of each behaviour.
 */
export interface NotificationsApi extends NotificationsFacade {
  execute<TCommand extends NotificationCommand>(
    command: TCommand,
  ): Promise<NotificationCommandResult<TCommand>>;
  /** Register behaviour owned by another feature without importing that feature here. */
  registerStoredExtension(extension: NotificationStoredExtension): () => void;
}

type NotificationCommandHandlers = {
  [K in NotificationCommandType]: (
    command: Extract<NotificationCommand, { type: K }>,
  ) => Promise<NotificationCommandResults[K]>;
};

const handlers: NotificationCommandHandlers = {
  initialize: (command) => notificationsFacade.initialize(command.payload),
  registerDevice: (command) => notificationsFacade.registerDevice(command.payload),
  enableDevice: (command) => notificationsFacade.enableDevice(command.payload),
  unregisterDevice: (command) => notificationsFacade.unregisterDevice(command.payload),
  refreshDeviceLocale: (command) => notificationsFacade.refreshDeviceLocale(command.payload),
  listDevices: (command) => notificationsFacade.listDevices(command.payload),
  listAccountDevices: (command) =>
    notificationsFacade.listAccountDevices(command.payload),
  revokeAccountDevice: (command) =>
    notificationsFacade.revokeAccountDevice(command.payload),
  sendSelfTest: (command) => notificationsFacade.sendSelfTest(command.payload),
  requestPermission: (command) => notificationsFacade.requestPermission(command.payload ?? {}),
  getPermissionState: () => notificationsFacade.getPermissionState(),
  openPermissionSettings: () => notificationsFacade.openPermissionSettings(),
  getPushPreference: (command) => notificationsFacade.getPushPreference(command.payload),
  setPushPreference: (command) => notificationsFacade.setPushPreference(command.payload),
  sendLocal: (command) => notificationsFacade.sendLocal(command.payload),
  publishTemplate: (command) => notificationsFacade.publishTemplate(command.payload),
  publishCustom: (command) => notificationsFacade.publishCustom(command.payload),
  publishEvent: (command) => notificationsFacade.publishEvent(command.payload),
  sendPush: (command) => notificationsFacade.sendPush(command.payload),
  listPushRecipients: (command) => notificationsFacade.listPushRecipients(command.payload),
  receive: (command) => notificationsFacade.receive(command.payload),
  importDelivered: (command) => notificationsFacade.importDelivered(command.payload ?? {}),
  createChannels: () => notificationsFacade.createChannels(),
  clearLocalInbox: () => notificationsFacade.clearLocalInbox(),
  synchronizeNotificationCenter: (command) =>
    notificationsFacade.synchronizeNotificationCenter(command.payload),
  list: (command) => notificationsFacade.list(command.payload),
  getUnreadCount: (command) => notificationsFacade.getUnreadCount(command.payload),
  markRead: (command) => notificationsFacade.markRead(command.payload),
  markManyRead: (command) => notificationsFacade.markManyRead(command.payload),
  markAllRead: (command) => notificationsFacade.markAllRead(command.payload),
  dismiss: (command) => notificationsFacade.dismiss(command.payload),
  openNotification: (command) => notificationsFacade.openNotification(command.payload),
  patchMetadata: (command) => notificationsFacade.patchMetadata(command.payload),
  enqueueRetry: (command) => notificationsFacade.enqueueRetry(command.payload),
  registerCenterExtension: async (command) =>
    notificationsFacade.registerCenterExtension(command.payload),
  executeTestScenario: (command) => notificationsFacade.executeTestScenario(command.payload),
  getDiagnostics: (command) => notificationsFacade.getDiagnostics(command.payload ?? {}),
};

const KNOWN_COMMAND_TYPES: ReadonlySet<string> = new Set(NOTIFICATION_COMMAND_TYPES);

function assertKnownCommand(command: unknown): asserts command is NotificationCommand {
  if (!command || typeof command !== "object" || Array.isArray(command)) {
    throw new NotificationError(
      NotificationErrorCodes.InvalidCommandPayload,
      "A notification command must be an object.",
      { field: "command" },
    );
  }
  const type = (command as { type?: unknown }).type;
  if (typeof type !== "string" || !KNOWN_COMMAND_TYPES.has(type)) {
    throw new NotificationError(
      NotificationErrorCodes.UnknownCommand,
      "Unknown notification command.",
      { field: "command.type" },
    );
  }
}

function dispatch<K extends NotificationCommandType>(
  command: Extract<NotificationCommand, { type: K }>,
): Promise<NotificationCommandResults[K]> {
  return handlers[command.type](command);
}

async function execute<TCommand extends NotificationCommand>(
  command: TCommand,
): Promise<NotificationCommandResult<TCommand>> {
  assertKnownCommand(command);
  return dispatch(command) as Promise<NotificationCommandResult<TCommand>>;
}

export const notifications: NotificationsApi = Object.assign(notificationsFacade, {
  execute,
  registerStoredExtension: registerNotificationStoredExtension,
});
