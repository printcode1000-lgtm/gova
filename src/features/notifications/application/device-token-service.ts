"use client";

import type { DeviceToken } from "../domain/entities";
import { capacitorPushService } from "../infrastructure/capacitor/capacitor-push.service";
import { asolNotificationRepository } from "../infrastructure/asol-notification-repository";
import { notificationApiService } from "../services/notification-api-service";
import type { NotificationEntity } from "../domain/entities";
import { webPushBrowserService } from "./web-push-browser-service";

export class DeviceTokenService {
  async register(uid: string, phone: string): Promise<DeviceToken | null> {
    const token = await capacitorPushService.register(uid);
    if (token) {
      await asolNotificationRepository.saveDeviceToken(token);
      await notificationApiService.registerToken({
        uid: token.uid,
        phone,
        platform: token.platform,
        provider: token.provider,
        deviceId: token.deviceId,
        token: token.token,
        deviceLabel: token.deviceLabel,
      });
    }
    return token;
  }

  async initialize(
    uid: string,
    phone: string,
    handlers: {
      onReceived: (notification: NotificationEntity) => Promise<void> | void;
      onAction: (notification: NotificationEntity) => Promise<void> | void;
    },
  ): Promise<void> {
    await capacitorPushService.initialize(uid, handlers);
    if (!(await capacitorPushService.isEnabled())) return;
    const permission = await capacitorPushService.permissionState();
    if (permission === "granted") await this.register(uid, phone);
  }

  async unregister(uid: string, phone: string): Promise<void> {
    const tokens = await this.list(uid);
    await Promise.all(
      tokens.map(async (token) => {
        await notificationApiService.removeToken({ uid, phone, tokenId: token.id });
        await asolNotificationRepository.removeDeviceToken(uid, token.id);
      }),
    );
    if (webPushBrowserService.isSupported()) {
      await webPushBrowserService.unsubscribe(uid, phone);
    }
    await capacitorPushService.unregister();
  }

  isAndroid(): boolean {
    return capacitorPushService.isAndroid();
  }

  isNativePush(): boolean {
    return capacitorPushService.isNativePush();
  }

  getPlatform(): "android" | "ios" | "web" {
    return capacitorPushService.getPlatform();
  }

  isAndroidEnabled(): Promise<boolean> {
    return capacitorPushService.isEnabled();
  }

  isNativeEnabled(): Promise<boolean> {
    return capacitorPushService.isEnabled();
  }

  getAndroidPermission() {
    return capacitorPushService.permissionState();
  }

  list(uid: string): Promise<DeviceToken[]> {
    return asolNotificationRepository.listDeviceTokens(uid);
  }

  async remove(uid: string, phone: string, tokenId: string): Promise<void> {
    await asolNotificationRepository.removeDeviceToken(uid, tokenId);
    await notificationApiService.removeToken({ uid, phone, tokenId });
  }
}

export const notificationDeviceTokenService = new DeviceTokenService();
