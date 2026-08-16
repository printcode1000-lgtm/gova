"use client";

import type { DeviceToken } from "../domain/entities";
import { assertPhone, assertUid } from "../domain/notification-validation";
import { notificationLog } from "../domain/notification-redaction";
import {
  nativePushService,
  type NativePushHandlers,
} from "../infrastructure/native/native-push.service";
import { asolNotificationRepository } from "../infrastructure/asol-notification-repository";
import { webPushBrowserService } from "../infrastructure/web-push/web-push-browser.service";
import { notificationApiService } from "../services/notification-api-service";
import { SingleFlight } from "../shared/keyed-mutex";

/**
 * This device's push registration.
 *
 * It hides the native/browser split behind one vocabulary so nothing above it
 * branches on the platform, and it is the only place that knows a registration
 * involves both local storage and the server.
 */
export class DeviceTokenService {
  private readonly flights = new SingleFlight();

  async register(uid: string, phone: string): Promise<DeviceToken | null> {
    const safeUid = assertUid(uid);
    const safePhone = assertPhone(phone);
    // Coalesced: the opt-in dialog, the settings toggle, and a resume can all
    // ask at once, and each extra call is a redundant provider round trip.
    return this.flights.run(`register:${safeUid}`, async () => {
      const token = await nativePushService.register(safeUid);
      if (!token) return null;
      await this.persist(token, safePhone);
      return token;
    });
  }

  /** Store this device's token locally and register it with the server. */
  private async persist(token: DeviceToken, phone: string): Promise<void> {
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

  /**
   * Attach this device to a session.
   *
   * Single-flight per user: React strict mode mounts effects twice in
   * development, and a session refresh can re-run the same effect in
   * production.
   */
  async initialize(
    uid: string,
    phone: string,
    handlers: NativePushHandlers,
  ): Promise<void> {
    const safeUid = assertUid(uid);
    const safePhone = assertPhone(phone);
    await this.flights.run(`initialize:${safeUid}`, async () => {
      // The caller supplies notification handling; rotation is this layer's
      // business, because only it knows a registration is local storage plus a
      // server call. Injecting it keeps infrastructure from reaching upward.
      await nativePushService.initialize(safeUid, {
        ...handlers,
        onTokenRefresh: async (token) => {
          try {
            await this.persist(token, safePhone);
          } catch (error) {
            notificationLog.warn(
              "Push token rotation could not be registered with the server.",
              error,
            );
          }
        },
      });
      if (!(await nativePushService.isEnabled())) return;
      if ((await nativePushService.permissionState()) !== "granted") return;
      await this.register(safeUid, safePhone);
    });
  }

  syncDeliveredNotifications(): Promise<void> {
    return nativePushService.syncDeliveredNotifications();
  }

  /** Declare the Android notification channels. No-op elsewhere. */
  createChannels(): Promise<void> {
    return nativePushService.createChannels();
  }

  /**
   * Re-register every token this device owns after a language switch, so the
   * server keeps building push text in the language the user now reads.
   * Silent by design: nothing is registered that was not registered already.
   */
  async refreshLocale(uid: string, phone: string): Promise<void> {
    if (!uid) return;
    const safeUid = assertUid(uid);
    const safePhone = assertPhone(phone);
    if (
      nativePushService.isNativePush() &&
      (await nativePushService.isEnabled()) &&
      (await nativePushService.permissionState()) === "granted"
    ) {
      await this.register(safeUid, safePhone);
    }
    if (webPushBrowserService.isSupported()) {
      await webPushBrowserService.refreshLocale(safeUid, safePhone);
    }
  }

  async unregister(uid: string, phone: string): Promise<void> {
    const safeUid = assertUid(uid);
    const safePhone = assertPhone(phone);
    const tokens = await this.list(safeUid);
    await Promise.all(
      tokens.map(async (token) => {
        try {
          await notificationApiService.removeToken({
            uid: safeUid,
            phone: safePhone,
            deviceId: token.deviceId,
          });
        } catch (error) {
          // Sign-out must never be blocked by a failed server call; the local
          // copy is removed either way so this device stops claiming the token.
          notificationLog.warn("Server token removal failed.", error);
        }
        await asolNotificationRepository.removeDeviceToken(safeUid, token.id);
      }),
    );
    if (webPushBrowserService.isSupported()) {
      await webPushBrowserService.unsubscribe(safeUid, safePhone);
    }
    await nativePushService.unregister();
  }

  isNativePush(): boolean {
    return nativePushService.isNativePush();
  }

  /**
   * Whether this platform can deliver push at all — native FCM/APNs, or Web Push
   * in a secure browser context.
   */
  isPushSupported(): boolean {
    return (
      nativePushService.isNativePush() || webPushBrowserService.isSupported()
    );
  }

  /**
   * Whether this device already opted in: the stored native flag, or an active
   * browser subscription.
   */
  async isDeviceEnabled(): Promise<boolean> {
    if (nativePushService.isNativePush())
      return nativePushService.isEnabled();
    return webPushBrowserService.hasSubscription();
  }

  /**
   * Opt this device in on whichever transport the platform supports. Native
   * registers an FCM/APNs token; the browser subscribes to Web Push.
   */
  async enable(uid: string, phone: string): Promise<void> {
    const safeUid = assertUid(uid);
    const safePhone = assertPhone(phone);
    if (nativePushService.isNativePush()) {
      await this.register(safeUid, safePhone);
      return;
    }
    await webPushBrowserService.subscribe(safeUid, safePhone);
  }

  getPlatform(): "android" | "ios" | "web" {
    return nativePushService.getPlatform();
  }

  list(uid: string): Promise<DeviceToken[]> {
    return asolNotificationRepository.listDeviceTokens(assertUid(uid));
  }
}

export const notificationDeviceTokenService = new DeviceTokenService();
