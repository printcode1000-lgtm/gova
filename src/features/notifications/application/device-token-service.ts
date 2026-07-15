"use client";

import type { DeviceToken } from "../domain/entities";
import { capacitorPushService } from "../infrastructure/capacitor/capacitor-push.service";
import { asolNotificationRepository } from "../infrastructure/asol-notification-repository";
import { notificationApiService } from "../services/notification-api-service";

export class DeviceTokenService {
  async register(uid: string): Promise<DeviceToken | null> {
    const token = await capacitorPushService.register(uid);
    if (token) {
      await asolNotificationRepository.saveDeviceToken(token);
      await notificationApiService.registerToken({
        uid: token.uid,
        platform: token.platform,
        provider: token.provider,
        deviceId: token.deviceId,
        token: token.token,
        deviceLabel: token.deviceLabel,
      });
    }
    return token;
  }

  list(uid: string): Promise<DeviceToken[]> {
    return asolNotificationRepository.listDeviceTokens(uid);
  }

  async remove(uid: string, tokenId: string): Promise<void> {
    await asolNotificationRepository.removeDeviceToken(uid, tokenId);
    await notificationApiService.removeToken({ uid, tokenId });
  }
}

export const notificationDeviceTokenService = new DeviceTokenService();
