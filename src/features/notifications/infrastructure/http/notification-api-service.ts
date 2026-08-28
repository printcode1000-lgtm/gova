import { asolApi, ASOL_API_ROUTES } from "@/core/api";
import {
  deliverNotificationGrants,
  type NotificationBridgeRecipientResult,
  type NotificationBridgeResult,
} from '@asol/account-bridge/notifications';
import type {
  AccountDevicesResult,
  DeleteNotificationTokenInput,
  DeviceToken,
  BroadcastNotificationInput,
  BroadcastNotificationResult,
  BroadcastRecipientsResult,
  AuthenticatedNotificationTestInput,
  NotificationDeliveryPreference,
  NotificationTestInput,
  NotificationTestResult,
  RegisterNotificationTokenInput,
  SelfTestNotificationResult,
} from "@asol/notifications-core";

/**
 * Browser-side notification API.
 *
 * Multi-user delivery is deliberately absent: fan-out lives on the notifications
 * service and is reached through a signed grant, never from here.
 *
 * So is the Web Push VAPID key. The public half is a constant in
 * `domain/web-push-config.ts` — a browser receives it anyway — so subscribing
 * needs no round trip, and there is nothing about it for an admin to edit.
 */
export class NotificationApiService {
  /**
   * `silent` is for registrations the user never asked for — the background
   * locale refresh — where the caller already handles a failed round trip. It
   * only stops the API client from logging the failure at error level; the
   * call still rejects and the caller still decides what to do.
   */
  registerToken(
    input: RegisterNotificationTokenInput,
    options: { silent?: boolean } = {},
  ): Promise<DeviceToken> {
    return asolApi.post<DeviceToken>(
      ASOL_API_ROUTES.notifications.deviceToken,
      input,
      { suppressErrorLog: options.silent === true },
    );
  }

  removeToken(
    input: DeleteNotificationTokenInput,
    options: { silent?: boolean } = {},
  ): Promise<{ deleted: boolean }> {
    const query = new URLSearchParams({ uid: input.uid });
    if (input.phone) query.set("phone", input.phone);
    if (input.deviceId) query.set("deviceId", input.deviceId);
    if (input.tokenId) query.set("tokenId", input.tokenId);
    return asolApi.delete<{ deleted: boolean }>(
      `${ASOL_API_ROUTES.notifications.deviceToken}?${query}`,
      { suppressErrorLog: options.silent === true },
    );
  }

  getPushPreference(identity: {
    uid: string;
    phone: string;
  }): Promise<NotificationDeliveryPreference> {
    const query = new URLSearchParams({
      uid: identity.uid,
      phone: identity.phone,
    });
    return asolApi.get<NotificationDeliveryPreference>(
      `${ASOL_API_ROUTES.notifications.preferences}?${query}`,
      { cache: "no-store" },
    );
  }

  setPushPreference(input: {
    uid: string;
    phone: string;
    pushEnabled: boolean;
  }): Promise<NotificationDeliveryPreference> {
    return asolApi.post<NotificationDeliveryPreference>(
      ASOL_API_ROUTES.notifications.preferences,
      input,
    );
  }

  getBroadcastRecipients(identity: {
    uid: string;
    phone: string;
  }): Promise<BroadcastRecipientsResult> {
    const query = new URLSearchParams({
      uid: identity.uid,
      phone: identity.phone,
    });
    return asolApi.get<BroadcastRecipientsResult>(
      `${ASOL_API_ROUTES.notifications.broadcastRecipients}?${query}`,
      { cache: "no-store" },
    );
  }

  async sendBroadcast(
    input: BroadcastNotificationInput,
  ): Promise<BroadcastNotificationResult> {
    const granted = await asolApi.post<BroadcastNotificationResult>(
      ASOL_API_ROUTES.notifications.broadcastSend,
      input,
      { notificationGrantDelivery: "manual" },
    );
    const delivery = await deliverNotificationGrants(granted);
    return mergeBroadcastDeliveryResult(granted, delivery.recipientResults);
  }

  /**
   * Every device on the account, and revoking one of them.
   *
   * Both authorise with the signed session rather than a uid/phone pair in the
   * query, because either one can reach a registration this browser does not
   * own — the local token store cannot see another device at all.
   */
  listAccountDevices(sessionToken: string): Promise<AccountDevicesResult> {
    return asolApi.get<AccountDevicesResult>(
      ASOL_API_ROUTES.notifications.devices,
      { headers: sessionHeaders(sessionToken), cache: "no-store" },
    );
  }

  revokeAccountDevice(
    sessionToken: string,
    deviceId: string,
  ): Promise<{ deleted: boolean }> {
    const query = new URLSearchParams({ deviceId });
    return asolApi.delete<{ deleted: boolean }>(
      `${ASOL_API_ROUTES.notifications.devices}?${query}`,
      { headers: sessionHeaders(sessionToken) },
    );
  }

  /** The account's own delivery test: no content crosses the wire, only a locale. */
  async sendSelfTest(
    sessionToken: string,
    locale: "ar" | "en",
  ): Promise<SelfTestNotificationResult> {
    const granted = await asolApi.post<SelfTestNotificationResult>(
      ASOL_API_ROUTES.notifications.testSelf,
      { locale },
      {
        headers: sessionHeaders(sessionToken),
        notificationGrantDelivery: "manual",
      },
    );
    const delivery = await deliverNotificationGrants(granted);
    return mergeSelfTestDeliveryResult(granted, delivery);
  }

  async sendTest(
    input: AuthenticatedNotificationTestInput,
  ): Promise<NotificationTestResult> {
    const request = prepareNotificationTestRequest(input);
    const granted = await asolApi.post<NotificationTestResult>(
      ASOL_API_ROUTES.notifications.testSend,
      request.body,
      {
        headers: request.headers,
        notificationGrantDelivery: "manual",
      },
    );
    const delivery = await deliverNotificationGrants(granted);
    return mergeNotificationTestDeliveryResult(
      granted,
      delivery.recipientResults,
    );
  }

}

export const notificationApiService = new NotificationApiService();

function sessionHeaders(sessionToken: string): Record<string, string> {
  const token = sessionToken.trim();
  if (!token) throw new Error("sessionTokenInvalid");
  return { "x-asol-session-token": token };
}

/**
 * Replace the grant placeholder with the notifications service's real outcome.
 *
 * Two different silences used to collapse into `failed`, which is what made a
 * broken test unreadable: a grant the bridge never carried at all reported the
 * same thing as one the provider refused. They are kept apart here.
 *
 * `granted` — the main app's own placeholder — survives only when the bridge
 * attempted nothing (no browser, no grant in the response, no notifications
 * service URL). It means authorised but never delivered, and the settings
 * surface says exactly that. Once delivery was attempted and still produced no
 * recipient outcome, `failed` is the honest answer.
 */
export function mergeSelfTestDeliveryResult(
  granted: SelfTestNotificationResult,
  delivery: Pick<NotificationBridgeResult, "attempted" | "recipientResults">,
): SelfTestNotificationResult {
  const expectedUid = granted.results[0]?.uid;
  const actual = delivery.recipientResults.find(
    (result) => result.uid === expectedUid,
  );
  if (actual) return { ...granted, results: [actual] };
  if (delivery.attempted === 0) return granted;
  return {
    ...granted,
    results: granted.results.map((placeholder) => ({
      uid: placeholder.uid,
      tokenCount: 0,
      status: "failed" as const,
    })),
  };
}

/** Replace grant placeholders with the notifications service's real outcomes. */
export function mergeBroadcastDeliveryResult(
  granted: BroadcastNotificationResult,
  delivered: NotificationBridgeRecipientResult[],
): BroadcastNotificationResult {
  const byUid = new Map(delivered.map((result) => [result.uid, result]));
  return {
    ...granted,
    results: granted.results.map((placeholder) => {
      const actual = byUid.get(placeholder.uid);
      return actual ?? {
        uid: placeholder.uid,
        tokenCount: 0,
        status: "failed" as const,
      };
    }),
  };
}

export function prepareNotificationTestRequest(
  input: AuthenticatedNotificationTestInput,
): {
  body: NotificationTestInput;
  headers: Record<string, string>;
} {
  const { sessionToken, ...identity } = input.identity;
  if (!sessionToken.trim()) throw new Error("sessionTokenInvalid");
  return {
    body: { ...input, identity },
    headers: { "x-asol-session-token": sessionToken },
  };
}

export function mergeNotificationTestDeliveryResult(
  granted: NotificationTestResult,
  delivered: NotificationBridgeRecipientResult[],
): NotificationTestResult {
  const expectedUid = granted.results[0]?.uid;
  const actual = delivered.find((result) => result.uid === expectedUid);
  return {
    ...granted,
    results: actual
      ? [actual]
      : granted.results.map((placeholder) => ({
          uid: placeholder.uid,
          tokenCount: 0,
          status: "failed" as const,
        })),
  };
}
