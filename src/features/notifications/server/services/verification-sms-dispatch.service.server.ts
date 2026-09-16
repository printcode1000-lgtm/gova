import "server-only";

import { SUPER_ADMIN_UID } from "@asol/auth-core";
import {
  NotificationCategories,
  NotificationPriorities,
  NotificationSounds,
} from "@asol/notifications-core";
import { createNotificationGrant } from "@asol/notifications-core/server";
import {
  buildVerificationSmsDispatchMetadata,
  type VerificationSmsDispatchRequest,
} from "@asol/verification-core";
import { ListNotificationTokensQuery } from "@asol/data-core/notifications";
import {
  verificationDispatchTransport,
  type VerificationDispatchTransport,
} from "../ports/verification-dispatch-transport";

export type VerificationSmsDispatchOutcome =
  | { delivered: true }
  | { delivered: false; failureCode: "smsGatewayUnavailable" | "dispatchUndeliverable" };

/**
 * Sends the verification SMS wake-up signal to the one device that can act on it.
 *
 * The recipient is not a choice the caller makes: always the Super Admin account,
 * always its Android registration, because the SMS gateway is that phone. A
 * missing Android registration is an unavailable gateway — never a fan-out to the
 * iOS token, and never a downgrade to email for an Egyptian number.
 *
 * Delivery is server-owned for every requester runtime. Handing the signal to the
 * requesting device instead cannot work for registration or password recovery,
 * where the requester has no session with which to reach the notifications
 * deployment, and would give a pre-authentication client a signed ticket it has no
 * reason to hold.
 */
export class VerificationSmsDispatchService {
  constructor(
    private readonly tokens = new ListNotificationTokensQuery(),
    private readonly transport: () => VerificationDispatchTransport = verificationDispatchTransport,
    private readonly superAdminUid: string = SUPER_ADMIN_UID,
  ) {}

  async dispatch(request: VerificationSmsDispatchRequest): Promise<VerificationSmsDispatchOutcome> {
    const registrations = (await this.tokens.byUids([this.superAdminUid]))[this.superAdminUid] ?? [];
    const gateway = registrations.filter(
      (token) => token.platform === "android" && token.provider === "fcm" && token.enabled,
    );
    if (gateway.length === 0) return { delivered: false, failureCode: "smsGatewayUnavailable" };

    const grant = createNotificationGrant(
      {
        uids: [this.superAdminUid],
        // Inside the signature, so no courier can widen the send back to the
        // Super Admin's other devices.
        platforms: ["android"],
        // Keyed by dispatch id: a redelivered push collapses onto one signal, and
        // the native worker de-duplicates on the same id.
        dedupeKey: `verification-sms-dispatch:${request.dispatchId}`,
        title: "",
        body: "",
        category: NotificationCategories.System,
        // High priority is what wakes a dozing process; the gateway must not wait
        // for the Super Admin to open the app.
        priority: NotificationPriorities.High,
        sound: NotificationSounds.Silent,
        metadata: buildVerificationSmsDispatchMetadata(request),
      },
      { actorUid: null },
    );

    return (await this.transport().deliverGrant(grant))
      ? { delivered: true }
      : { delivered: false, failureCode: "dispatchUndeliverable" };
  }
}

export const verificationSmsDispatchService = new VerificationSmsDispatchService();
