import { asolApi, ASOL_API_ROUTES } from "@/core/api";
import {
  deliverNotificationGrants,
  type NotificationBridgeRecipientResult,
} from "@/modules/notification-bridge";
import type {
  DeleteNotificationTokenInput,
  DeviceToken,
  BroadcastNotificationInput,
  BroadcastNotificationResult,
  BroadcastRecipientsResult,
  NotificationTestInput,
  NotificationTestResult,
  RegisterNotificationTokenInput,
} from "../domain/entities";

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
  registerToken(input: RegisterNotificationTokenInput): Promise<DeviceToken> {
    return asolApi.post<DeviceToken>(
      ASOL_API_ROUTES.notifications.deviceToken,
      input,
    );
  }

  removeToken(
    input: DeleteNotificationTokenInput,
  ): Promise<{ deleted: boolean }> {
    const query = new URLSearchParams({ uid: input.uid });
    if (input.phone) query.set("phone", input.phone);
    if (input.deviceId) query.set("deviceId", input.deviceId);
    if (input.tokenId) query.set("tokenId", input.tokenId);
    return asolApi.delete<{ deleted: boolean }>(
      `${ASOL_API_ROUTES.notifications.deviceToken}?${query}`,
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

  async sendTest(input: NotificationTestInput): Promise<NotificationTestResult> {
    const granted = await asolApi.post<NotificationTestResult>(
      ASOL_API_ROUTES.notifications.testSend,
      input,
      { notificationGrantDelivery: "manual" },
    );
    const delivery = await deliverNotificationGrants(granted);
    return mergeNotificationTestDeliveryResult(
      granted,
      delivery.recipientResults,
    );
  }

}

export const notificationApiService = new NotificationApiService();

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
