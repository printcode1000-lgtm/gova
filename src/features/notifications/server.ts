import "server-only";

import type {
  AccountDevicesResult,
  BroadcastNotificationInput,
  BroadcastNotificationResult,
  BroadcastRecipientsResult,
  DeleteNotificationTokenInput,
  DeviceToken,
  NotificationDeliveryPreference,
  NotificationTestInput,
  NotificationTestResult,
  RegisterNotificationTokenInput,
  SelfTestNotificationInput,
  SelfTestNotificationResult,
  SendNotificationToUsersInput,
} from "@asol/notifications-core";
import { withNotificationGrants } from "./domain/notification-grant-envelope";
import { NotificationGrantCollector } from "./services/notification-grant-collector.server";
import {
  notificationBroadcastService,
  notificationSelfTestService,
  notificationTokenService,
} from "./services/notification-service.bootstrap.server";
import { notificationRecipientTokensService } from "./services/notification-recipient-tokens.service.server";
import { mobilePushUnlockService } from "./services/mobile-push-unlock.service.server";

export interface NotificationGrantIssuer {
  issue(send: SendNotificationToUsersInput): boolean;
  readonly size: number;
  toArray(): string[];
}

export type NotificationServerCommand =
  | { type: "registerDeviceToken"; payload: RegisterNotificationTokenInput }
  | { type: "removeDeviceToken"; payload: DeleteNotificationTokenInput }
  | { type: "listBroadcastRecipients"; payload: { uid: string; phone: string } }
  | { type: "sendBroadcast"; payload: BroadcastNotificationInput }
  | { type: "sendTestNotification"; payload: NotificationTestInput }
  | { type: "listAccountDevices"; payload: { uid: string; phone: string } }
  | { type: "sendSelfTestNotification"; payload: SelfTestNotificationInput };

export interface NotificationServerCommandResults {
  registerDeviceToken: DeviceToken;
  removeDeviceToken: void;
  listBroadcastRecipients: BroadcastRecipientsResult;
  sendBroadcast: BroadcastNotificationResult;
  sendTestNotification: NotificationTestResult;
  listAccountDevices: AccountDevicesResult;
  sendSelfTestNotification: SelfTestNotificationResult;
}

export type NotificationServerCommandResult<TCommand extends NotificationServerCommand> =
  NotificationServerCommandResults[TCommand["type"]];

type NotificationServerCommandType = NotificationServerCommand["type"];
type NotificationServerHandlers = {
  [K in NotificationServerCommandType]: (
    command: Extract<NotificationServerCommand, { type: K }>,
  ) => Promise<NotificationServerCommandResults[K]>;
};

const handlers: NotificationServerHandlers = {
  registerDeviceToken: (command) => notificationTokenService.register(command.payload),
  removeDeviceToken: (command) => notificationTokenService.remove(command.payload),
  listBroadcastRecipients: (command) => notificationBroadcastService.listRecipients(command.payload),
  sendBroadcast: (command) => notificationBroadcastService.send(command.payload),
  sendTestNotification: (command) => notificationBroadcastService.sendTest(command.payload),
  listAccountDevices: (command) => notificationTokenService.listForAccount(command.payload),
  sendSelfTestNotification: (command) => notificationSelfTestService.send(command.payload),
};

const KNOWN_SERVER_COMMANDS: ReadonlySet<string> = new Set(Object.keys(handlers));

function dispatchServerCommand<K extends NotificationServerCommandType>(
  command: Extract<NotificationServerCommand, { type: K }>,
): Promise<NotificationServerCommandResults[K]> {
  return handlers[command.type](command);
}

export const notificationsServer = {
  async execute<TCommand extends NotificationServerCommand>(
    command: TCommand,
  ): Promise<NotificationServerCommandResult<TCommand>> {
    if (!command || typeof command !== "object" || Array.isArray(command)) {
      throw new Error("notificationServerCommandInvalid");
    }
    const type = (command as { type?: unknown }).type;
    if (typeof type !== "string" || !KNOWN_SERVER_COMMANDS.has(type)) {
      throw new Error("notificationServerCommandUnknown");
    }
    return dispatchServerCommand(command) as Promise<NotificationServerCommandResult<TCommand>>;
  },

  registerDeviceToken(input: RegisterNotificationTokenInput): Promise<DeviceToken> {
    return notificationTokenService.register(input);
  },

  removeDeviceToken(input: DeleteNotificationTokenInput): Promise<void> {
    return notificationTokenService.remove(input);
  },

  listAccountDevices(identity: { uid: string; phone: string }): Promise<AccountDevicesResult> {
    return notificationTokenService.listForAccount(identity);
  },

  sendSelfTestNotification(input: SelfTestNotificationInput): Promise<SelfTestNotificationResult> {
    return notificationSelfTestService.send(input);
  },

  getPushPreference(identity: {
    uid: string;
    phone: string;
  }): Promise<NotificationDeliveryPreference> {
    return notificationTokenService.getPushPreference(identity.uid, identity.phone);
  },

  setPushPreference(input: {
    uid: string;
    phone: string;
    pushEnabled: boolean;
  }): Promise<NotificationDeliveryPreference> {
    return notificationTokenService.setPushPreference(input.uid, input.phone, input.pushEnabled);
  },

  listBroadcastRecipients(identity: {
    uid: string;
    phone: string;
  }): Promise<BroadcastRecipientsResult> {
    return notificationBroadcastService.listRecipients(identity);
  },

  sendBroadcast(input: BroadcastNotificationInput): Promise<BroadcastNotificationResult> {
    return notificationBroadcastService.send(input);
  },

  sendTestNotification(input: NotificationTestInput): Promise<NotificationTestResult> {
    return notificationBroadcastService.sendTest(input);
  },

  createGrantIssuer(actorUid: string | null = null): NotificationGrantIssuer {
    return new NotificationGrantCollector(actorUid);
  },

  attachGrants: withNotificationGrants,

  resolveRecipientTokensForGrants(
    input: Parameters<typeof notificationRecipientTokensService.resolve>[0],
  ) {
    return notificationRecipientTokensService.resolve(input);
  },

  unlockMobilePushCredentials(
    input: Parameters<typeof mobilePushUnlockService.unlock>[0],
  ) {
    return mobilePushUnlockService.unlock(input);
  },
} as const;

export { moneyVariablesByLocale } from "./shared/notification-money";
export {
  readNotificationGrants,
  NOTIFICATION_GRANTS_KEY,
  type NotificationGrantCarrier,
} from "./domain/notification-grant-envelope";
export {
  NotificationError,
  NotificationErrorCodes,
  isNotificationError,
  type NotificationErrorCode,
} from "./domain/notification-error";
export * from "@asol/notifications-core";
export {
  NOTIFICATION_TEST_SCENARIOS,
  NotificationTestScenarioIds,
  getNotificationTestScenario,
  type NotificationTestScenario,
  type NotificationTestScenarioId,
} from "@asol/notifications-core";

export { registerNotificationsCorePorts } from './notifications-core-ports';
export {
  configureNotificationAdminAuthorization,
  type NotificationAdminIdentity,
} from './server/notification-admin-authorization';
export {
  handleDevNotificationSendOptions,
  handleDevNotificationSendPost,
  isDevNotificationSendEnabled,
} from './server/dev-notification-send-handler.server';
