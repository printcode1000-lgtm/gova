import { asolApi, ASOL_API_ROUTES } from "@/core/api";
import type {
  DeleteNotificationTokenInput,
  DeviceToken,
  BroadcastNotificationInput,
  BroadcastNotificationResult,
  BroadcastRecipientsResult,
  GenerateNotificationVapidInput,
  NotificationVapidAdminConfig,
  NotificationVapidPublicConfig,
  RegisterNotificationTokenInput,
  SaveNotificationVapidInput,
} from "../domain/entities";

/**
 * Browser-side notification API.
 *
 * Multi-user delivery is deliberately absent: `POST /api/notifications/send`
 * is guarded by a server-only bearer secret, so it is reachable from server
 * code only. Server callers use `NotificationSendService` directly.
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

  sendBroadcast(
    input: BroadcastNotificationInput,
  ): Promise<BroadcastNotificationResult> {
    return asolApi.post<BroadcastNotificationResult>(
      ASOL_API_ROUTES.notifications.broadcastSend,
      input,
    );
  }

  getWebPushPublicKey(): Promise<NotificationVapidPublicConfig> {
    return asolApi.get<NotificationVapidPublicConfig>(
      ASOL_API_ROUTES.notifications.webPushPublicKey,
      { cache: "no-store" },
    );
  }

  getVapidAdmin(identity: {
    uid: string;
    phone: string;
  }): Promise<NotificationVapidAdminConfig> {
    const query = new URLSearchParams({
      uid: identity.uid,
      phone: identity.phone,
    });
    return asolApi.get<NotificationVapidAdminConfig>(
      `${ASOL_API_ROUTES.notifications.webPushVapid}?${query}`,
      { cache: "no-store" },
    );
  }

  generateVapid(
    input: GenerateNotificationVapidInput,
  ): Promise<NotificationVapidAdminConfig> {
    return asolApi.post<NotificationVapidAdminConfig>(
      ASOL_API_ROUTES.notifications.webPushVapid,
      input,
    );
  }

  saveVapid(
    input: SaveNotificationVapidInput,
  ): Promise<NotificationVapidAdminConfig> {
    return asolApi.put<NotificationVapidAdminConfig>(
      ASOL_API_ROUTES.notifications.webPushVapid,
      input,
    );
  }
}

export const notificationApiService = new NotificationApiService();
