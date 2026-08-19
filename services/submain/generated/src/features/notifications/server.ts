import "server-only";

import type {
  BroadcastNotificationInput,
  BroadcastNotificationResult,
  BroadcastRecipientsResult,
  DeleteNotificationTokenInput,
  DeviceToken,
  NotificationDeliveryPreference,
  NotificationTestInput,
  NotificationTestResult,
  RegisterNotificationTokenInput,
  SendNotificationToUsersInput,
} from "@asol/notifications-core";
import { withNotificationGrants } from "./domain/notification-grant-envelope";
import { NotificationGrantCollector } from "./services/notification-grant-collector.server";
import {
  notificationBroadcastService,
  notificationTokenService,
} from "./services/notification-service.bootstrap.server";
import { notificationRecipientTokensService } from "./services/notification-recipient-tokens.service.server";
import { mobilePushUnlockService } from "./services/mobile-push-unlock.service.server";

/**
 * Notifications — the server entry point.
 *
 * A second entry point, not a second module. It exists only because everything
 * behind it imports `server-only`: grant signing needs a secret and the token
 * and broadcast services talk to the database, so routing any of it through
 * `index.ts` would drag `server-only` into every client component that imports
 * the module — a build error, not a style problem.
 *
 * It exports **no service instance**. A route gets use cases, not objects it
 * could hold, reconfigure, or call in an order the module does not expect. The
 * shape matches the client side deliberately: one facade, one `execute`, the
 * same command-as-data form.
 *
 * ```ts
 * import { notificationsServer } from "@/features/notifications/server";
 *
 * const token = await notificationsServer.registerDeviceToken(body);
 * ```
 */

// ---------------------------------------------------------------------------
// Grant issuing
// ---------------------------------------------------------------------------

/**
 * Collects the sends a route decided on, so they can be returned to the browser.
 *
 * A route never sends: it signs a decision only it can make — it owns the users
 * and orders data — and the browser carries that grant to the notifications
 * service. This is the one stateful object the server API hands out, because a
 * route accumulates grants across several branches before responding.
 */
export interface NotificationGrantIssuer {
  /** @returns whether the grant could be signed. Never throws. */
  issue(send: SendNotificationToUsersInput): boolean;
  readonly size: number;
  toArray(): string[];
}

export type NotificationServerCommand =
  | { type: "registerDeviceToken"; payload: RegisterNotificationTokenInput }
  | { type: "removeDeviceToken"; payload: DeleteNotificationTokenInput }
  | { type: "listBroadcastRecipients"; payload: { uid: string; phone: string } }
  | { type: "sendBroadcast"; payload: BroadcastNotificationInput }
  | { type: "sendTestNotification"; payload: NotificationTestInput };

export interface NotificationServerCommandResults {
  registerDeviceToken: DeviceToken;
  removeDeviceToken: void;
  listBroadcastRecipients: BroadcastRecipientsResult;
  sendBroadcast: BroadcastNotificationResult;
  sendTestNotification: NotificationTestResult;
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
  listBroadcastRecipients: (command) =>
    notificationBroadcastService.listRecipients(command.payload),
  sendBroadcast: (command) => notificationBroadcastService.send(command.payload),
  sendTestNotification: (command) => notificationBroadcastService.sendTest(command.payload),
};

const KNOWN_SERVER_COMMANDS: ReadonlySet<string> = new Set(Object.keys(handlers));

function dispatchServerCommand<K extends NotificationServerCommandType>(
  command: Extract<NotificationServerCommand, { type: K }>,
): Promise<NotificationServerCommandResults[K]> {
  return handlers[command.type](command);
}

/** The server-side counterpart of `notifications`. Use cases only. */
export const notificationsServer = {
  /**
   * Run one server command.
   *
   * Fails closed on anything it does not recognise, for the same reason the
   * client API does: a command is data, and silently ignoring an unknown one
   * reads as success at the call site.
   */
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
    // The handler map above is what the compiler verifies; see the note on the
    // client-side `execute` for why the correlation cannot survive this call.
    return dispatchServerCommand(command) as Promise<
      NotificationServerCommandResult<TCommand>
    >;
  },

  registerDeviceToken(input: RegisterNotificationTokenInput): Promise<DeviceToken> {
    return notificationTokenService.register(input);
  },

  removeDeviceToken(input: DeleteNotificationTokenInput): Promise<void> {
    return notificationTokenService.remove(input);
  },

  getPushPreference(identity: {
    uid: string;
    phone: string;
  }): Promise<NotificationDeliveryPreference> {
    return notificationTokenService.getPushPreference(identity.uid, identity.phone);
  },

  /** The account-wide mute switch. Registrations and tokens are untouched. */
  setPushPreference(input: {
    uid: string;
    phone: string;
    pushEnabled: boolean;
  }): Promise<NotificationDeliveryPreference> {
    return notificationTokenService.setPushPreference(
      input.uid,
      input.phone,
      input.pushEnabled,
    );
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

  /** A fresh grant collector for one request. */
  createGrantIssuer(actorUid: string | null = null): NotificationGrantIssuer {
    return new NotificationGrantCollector(actorUid);
  },

  /** Attach collected grants to a response body, omitting the key when empty. */
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

// ---------------------------------------------------------------------------
// The shared vocabulary a route needs
// ---------------------------------------------------------------------------
// Re-exported here as well as from `index.ts` so a route handler never has to
// import the client entry point and pull the React presentation graph with it.

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
export * from "@asol/notifications-core";
export {
  NOTIFICATION_TEST_SCENARIOS,
  NotificationTestScenarioIds,
  getNotificationTestScenario,
  type NotificationTestScenario,
  type NotificationTestScenarioId,
} from "@asol/notifications-core";
