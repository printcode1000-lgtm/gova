import { govaApi, GOVA_API_ROUTES } from '@/core/api';
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
  SendNotificationToUsersInput,
  SendNotificationToUsersResult,
} from '../domain/entities';

export class NotificationApiService {
  registerToken(input: RegisterNotificationTokenInput): Promise<DeviceToken> {
    return govaApi.post<DeviceToken>(GOVA_API_ROUTES.notifications.deviceToken, input);
  }

  removeToken(input: DeleteNotificationTokenInput): Promise<{ deleted: boolean }> {
    const query = new URLSearchParams({ uid: input.uid });
    if (input.deviceId) query.set('deviceId', input.deviceId);
    if (input.tokenId) query.set('tokenId', input.tokenId);
    return govaApi.delete<{ deleted: boolean }>(
      `${GOVA_API_ROUTES.notifications.deviceToken}?${query}`,
    );
  }

  sendToUsers(input: SendNotificationToUsersInput): Promise<SendNotificationToUsersResult> {
    return govaApi.post<SendNotificationToUsersResult>(
      GOVA_API_ROUTES.notifications.send,
      input,
    );
  }

  getBroadcastRecipients(identity: { uid: string; phone: string }): Promise<BroadcastRecipientsResult> {
    const query = new URLSearchParams({ uid: identity.uid, phone: identity.phone });
    return govaApi.get<BroadcastRecipientsResult>(
      `${GOVA_API_ROUTES.notifications.broadcastRecipients}?${query}`,
      { cache: 'no-store' },
    );
  }

  sendBroadcast(input: BroadcastNotificationInput): Promise<BroadcastNotificationResult> {
    return govaApi.post<BroadcastNotificationResult>(
      GOVA_API_ROUTES.notifications.broadcastSend,
      input,
    );
  }

  getWebPushPublicKey(): Promise<NotificationVapidPublicConfig> {
    return govaApi.get<NotificationVapidPublicConfig>(
      GOVA_API_ROUTES.notifications.webPushPublicKey,
      { cache: 'no-store' },
    );
  }

  getVapidAdmin(identity: { uid: string; phone: string }): Promise<NotificationVapidAdminConfig> {
    const query = new URLSearchParams({ uid: identity.uid, phone: identity.phone });
    return govaApi.get<NotificationVapidAdminConfig>(
      `${GOVA_API_ROUTES.notifications.webPushVapid}?${query}`,
      { cache: 'no-store' },
    );
  }

  generateVapid(input: GenerateNotificationVapidInput): Promise<NotificationVapidAdminConfig> {
    return govaApi.post<NotificationVapidAdminConfig>(
      GOVA_API_ROUTES.notifications.webPushVapid,
      input,
    );
  }

  saveVapid(input: SaveNotificationVapidInput): Promise<NotificationVapidAdminConfig> {
    return govaApi.put<NotificationVapidAdminConfig>(
      GOVA_API_ROUTES.notifications.webPushVapid,
      input,
    );
  }
}

export const notificationApiService = new NotificationApiService();
