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
        locale: token.locale,
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

  /**
   * Re-register every token this device owns after a language switch, so the
   * server keeps building push text in the language the user now reads.
   * Silent by design: nothing is registered that was not registered already.
   */
  async refreshLocale(uid: string, phone: string): Promise<void> {
    if (!uid) return;
    if (
      capacitorPushService.isNativePush() &&
      (await capacitorPushService.isEnabled()) &&
      (await capacitorPushService.permissionState()) === "granted"
    ) {
      await this.register(uid, phone);
    }
    if (webPushBrowserService.isSupported()) {
      await webPushBrowserService.refreshLocale(uid, phone);
    }
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

  /**
   * Whether this platform can deliver push at all — native FCM/APNs, or Web
   * Push in a secure browser context. The post-login opt-in dialog is shown on
   * every platform that answers `true`.
   */
  isPushSupported(): boolean {
    return (
      capacitorPushService.isNativePush() || webPushBrowserService.isSupported()
    );
  }

  /**
   * Whether this device already opted in: the stored native flag, or an active
   * browser subscription. Platform-agnostic counterpart of `isNativeEnabled`.
   */
  async isDeviceEnabled(): Promise<boolean> {
    if (capacitorPushService.isNativePush()) {
      return capacitorPushService.isEnabled();
    }
    return webPushBrowserService.hasSubscription();
  }

  /**
   * Opt this device in on whichever transport the platform supports.
   * Native registers an FCM/APNs token; the browser subscribes to Web Push.
   */
  async enable(uid: string, phone: string): Promise<void> {
    if (capacitorPushService.isNativePush()) {
      await this.register(uid, phone);
      return;
    }
    await webPushBrowserService.subscribe(uid, phone);
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
