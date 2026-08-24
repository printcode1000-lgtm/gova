"use client";

import {
  NativeCore,
  PermissionKinds,
  type NotificationPayload,
  type PushToken,
} from "@asol/native-core";
import type { Unsubscribe } from "@asol/native-core";
import type { DeviceToken, NotificationEntity } from "@asol/notifications-core";
import {
  isEmptySystemPlaceholderPayload,
  mapInboundPushToNotification,
} from "../../domain/inbound-notification-mapper";
import { NotificationError, NotificationErrorCodes } from "../../domain/notification-error";
import { notificationLog } from "../../domain/notification-redaction";
import { isDataOnlyDelivery } from "../../domain/notification-visibility";
import { resolvePushProvider } from "../../domain/push-token-kind";
import { assertUid } from "../../domain/notification-validation";
import { readNotificationLocale } from "../../application/shared/read-notification-locale";
import { SingleFlight } from "../../application/shared/keyed-mutex";
import { asolNotificationRepository } from "../asol-notification-repository";
import { pushDeviceStore } from "../push-device-store";
import { nativeLocalNotificationService } from "./native-local-notification.service";
import { nativePlatformService } from "./native-platform.service";

export type ReceivedHandler = (
  notification: NotificationEntity,
) => Promise<boolean> | boolean;

export type BatchReceivedHandler = (
  uid: string,
  notifications: readonly NotificationEntity[],
) => Promise<readonly NotificationEntity[]> | readonly NotificationEntity[];

export type ActionHandler = (notification: NotificationEntity) => Promise<void> | void;

export type TokenRefreshHandler = (token: DeviceToken) => Promise<void> | void;

export interface NativePushHandlers {
  onReceived: ReceivedHandler;
  onBatchReceived: BatchReceivedHandler;
  onAction: ActionHandler;
  /**
   * A token this device did not ask for right now — the provider rotated it.
   * Optional so a caller that only consumes notifications is unaffected.
   */
  onTokenRefresh?: TokenRefreshHandler;
}

export class NativePushService {
  private currentUid = "";
  /** The last token value this device has already reported. */
  private lastTokenValue = "";
  /**
   * True while `register()` is in flight. The rotation listener stands down then:
   * `register()` is already going to persist and post whatever token arrives, and
   * both listeners see the same emission.
   */
  private registering = false;
  private listenersReady = false;
  private listeners: Unsubscribe[] = [];
  private handlers: NativePushHandlers | null = null;
  private readonly imports = new SingleFlight();

  isAndroid(): boolean {
    return (
      nativePlatformService.isNative() &&
      nativePlatformService.getPlatform() === "android"
    );
  }

  isNativePush(): boolean {
    const platform = nativePlatformService.getPlatform();
    return (
      nativePlatformService.isNative() && (platform === "android" || platform === "ios")
    );
  }

  getPlatform(): "android" | "ios" | "web" {
    return nativePlatformService.getPlatform();
  }

  async initialize(uid: string, handlers: NativePushHandlers): Promise<void> {
    if (!this.isNativePush()) return;
    this.currentUid = assertUid(uid);
    this.handlers = handlers;
    await this.ensureListeners();
    try {
      await this.createChannels();
    } catch (error) {
      notificationLog.error("Notification channels could not be created.", error);
    }
  }

  async syncDeliveredNotifications(): Promise<void> {
    if (!this.isNativePush()) return;
    await this.importDelivered();
  }

  async register(uid: string): Promise<DeviceToken | null> {
    if (!this.isNativePush()) return null;
    const platform = nativePlatformService.getPlatform();
    if (platform !== "android" && platform !== "ios") return null;
    this.currentUid = assertUid(uid);
    await this.ensureListeners();

    this.registering = true;
    try {
      try {
        await this.createChannels();
      } catch (error) {
        notificationLog.error("Notification channels could not be created.", error);
        throw new NotificationError(
          NotificationErrorCodes.DeliveryFailed,
          "notificationChannelsUnavailable",
        );
      }

      const permRes = await NativeCore.checkPermission(PermissionKinds.Notifications);
      if (!permRes.ok || !permRes.value.granted) {
        throw new NotificationError(
          NotificationErrorCodes.PermissionDenied,
          "notificationPermissionDenied",
        );
      }

      let tokenValue = "";
      let timeout: NodeJS.Timeout | null = null;
      const tokenUnsub = { fn: null as (() => void) | null };
      const tokenPromise = new Promise<string>((resolve, reject) => {
        timeout = setTimeout(() => {
          reject(new Error("timed out waiting for push registration token"));
        }, 20_000);

        void NativeCore.onPushToken((token: PushToken) => {
          if (timeout) clearTimeout(timeout);
          tokenUnsub.fn?.();
          resolve(token.value);
        }).then((unsubRes) => {
          if (unsubRes.ok) {
            tokenUnsub.fn = unsubRes.value;
          } else {
            if (timeout) clearTimeout(timeout);
            reject(new Error(unsubRes.error.message));
          }
        });
      });

      const regRes = await NativeCore.registerForPushNotifications();
      if (!regRes.ok) {
        if (timeout) clearTimeout(timeout);
        tokenUnsub.fn?.();
        notificationLog.warn("Push registration failed.", regRes.error);
        throw new NotificationError(
          NotificationErrorCodes.DeliveryFailed,
          regRes.error.message.includes("timed out")
            ? "notificationRegistrationTimeout"
            : "notificationPermissionDenied",
        );
      }

      try {
        tokenValue = await tokenPromise;
      } catch (error: unknown) {
        if (timeout) clearTimeout(timeout);
        tokenUnsub.fn?.();
        const message = error instanceof Error ? error.message : "";
        notificationLog.warn("Push registration token resolution failed.", error);
        throw new NotificationError(
          NotificationErrorCodes.DeliveryFailed,
          message.includes("timed out")
            ? "notificationRegistrationTimeout"
            : "notificationPermissionDenied",
        );
      }

      const token = await this.buildDeviceToken(platform, tokenValue);
      this.lastTokenValue = tokenValue;
      return token;
    } finally {
      this.registering = false;
    }
  }

  async isEnabled(): Promise<boolean> {
    if (!this.isNativePush()) return false;
    const platform = nativePlatformService.getPlatform();
    if (platform !== "android" && platform !== "ios") return false;
    return pushDeviceStore.isEnabled(platform);
  }

  async unregister(): Promise<void> {
    if (!this.isNativePush()) return;
    const platform = nativePlatformService.getPlatform();
    if (platform !== "android" && platform !== "ios") return;
    await NativeCore.unregisterForPushNotifications();
    await NativeCore.removeAllDeliveredNotifications();
    await pushDeviceStore.setEnabled(platform, false);
    this.currentUid = "";
    this.lastTokenValue = "";
  }

  async permissionState(): Promise<"granted" | "denied" | "prompt" | "unsupported"> {
    if (!this.isNativePush()) return "unsupported";
    const res = await NativeCore.checkPermission(PermissionKinds.Notifications);
    if (!res.ok || res.value.state === "unsupported") return "unsupported";
    if (res.value.granted) return "granted";
    return res.value.state === "denied" || res.value.state === "blocked" ? "denied" : "prompt";
  }

  async createChannels(): Promise<void> {
    if (!this.isAndroid()) return;
    const res = await NativeCore.ensureNotificationChannels();
    if (!res.ok) {
      throw res.error;
    }
  }

  private async ensureListeners(): Promise<void> {
    if (this.listenersReady) return;
    this.listenersReady = true;

    const r1 = await NativeCore.onPushNotificationReceived((native: NotificationPayload) => {
      void this.handleReceived(native);
    });
    if (r1.ok) this.listeners.push(r1.value);

    const r2 = await NativeCore.onPushNotificationActionPerformed((native: NotificationPayload) => {
      void this.handleAction(native);
    });
    if (r2.ok) this.listeners.push(r2.value);

    // A rotation the user did not trigger. Without this the provider silently
    // replaces the token and the server keeps sending to the dead one.
    const r3 = await NativeCore.onPushToken((token: PushToken) => {
      void this.handleTokenRefresh(token.value);
    });
    if (r3.ok) this.listeners.push(r3.value);
  }

  private mapForCurrentUser(native: NotificationPayload): NotificationEntity | null {
    if (!this.currentUid) return null;
    const payloadUid = native.data?.uid?.trim();
    if (payloadUid && payloadUid !== this.currentUid) return null;
    return mapInboundPushToNotification(this.currentUid, native);
  }

  private async handleReceived(native: NotificationPayload): Promise<void> {
    const entity = this.mapForCurrentUser(native);
    if (!entity) return;
    try {
      const stored = await this.handlers?.onReceived(entity);
      if (stored) await this.presentForeground(entity);
    } catch (error) {
      notificationLog.error("Foreground receive failed.", error);
    }
  }

  private async handleAction(native: NotificationPayload): Promise<void> {
    const entity = this.mapForCurrentUser(native);
    if (!entity) return;
    try {
      await this.handlers?.onAction(entity);
    } catch (error) {
      notificationLog.error("Notification tap handling failed.", error);
    }
  }

  /**
   * A token arriving outside a registration call.
   *
   * Four reasons to do nothing, in order: `register()` is already handling this
   * emission; no user is attached, so there is nothing to register against; the
   * value is one this device has already reported; or this device is not opted
   * in.
   *
   * That last check is the one that is easy to miss. `initialize()` sets
   * `currentUid` and attaches these listeners on every start, before it knows
   * whether push is enabled — so on a device where the user turned the switch
   * off, the listeners are live and Android still delivers `onNewToken`.
   * Without the check, `buildDeviceToken` would flip the stored enabled flag
   * back to true and re-register the device with the server: a switch the user
   * set to off, silently back on, with no UI action behind it.
   */
  private async handleTokenRefresh(value: string): Promise<void> {
    const tokenValue = (value ?? "").trim();
    if (!tokenValue) return;
    if (this.registering) return;
    if (!this.currentUid) return;
    if (tokenValue === this.lastTokenValue) return;

    const platform = nativePlatformService.getPlatform();
    if (platform !== "android" && platform !== "ios") return;
    if (!(await pushDeviceStore.isEnabled(platform))) return;

    try {
      const token = await this.buildDeviceToken(platform, tokenValue);
      this.lastTokenValue = tokenValue;
      await this.handlers?.onTokenRefresh?.(token);
    } catch (error) {
      // Best effort: a failed rotation must never break the session. The device
      // re-registers on the next sign-in, language switch, or settings toggle.
      notificationLog.warn("A rotated push token could not be registered.", error);
    }
  }

  private async buildDeviceToken(
    platform: "android" | "ios",
    tokenValue: string,
  ): Promise<DeviceToken> {
    const now = new Date().toISOString();
    const deviceId = await pushDeviceStore.deviceId(platform);
    await pushDeviceStore.setEnabled(platform, true);
    return {
      id: `ntok_${this.currentUid}_${platform}_${deviceId}`.replace(/[^a-zA-Z0-9_:-]/g, "_"),
      uid: this.currentUid,
      platform,
      provider: resolvePushProvider(platform, tokenValue),
      deviceId,
      token: tokenValue,
      locale: await readNotificationLocale(),
      deviceLabel: platform === "android" ? "ASOL Android" : "ASOL iOS",
      enabled: true,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    };
  }

  private async presentForeground(entity: NotificationEntity): Promise<void> {
    if (!this.isAndroid()) return;
    if (isDataOnlyDelivery(entity)) return;
    try {
      const dismissed = new Set(await asolNotificationRepository.listDismissed(entity.uid));
      if (dismissed.has(entity.id) || dismissed.has(entity.dedupeKey)) return;
      await nativeLocalNotificationService.display(entity);
    } catch (error) {
      notificationLog.warn("Foreground display failed.", error);
    }
  }

  private async importDelivered(): Promise<void> {
    const uid = this.currentUid;
    const handlers = this.handlers;
    if (!uid || !handlers) return;

    await this.imports.run(`import:${uid}`, async () => {
      const res = await NativeCore.getDeliveredNotifications();
      if (!res.ok) {
        notificationLog.warn("Delivered-notification inbox is unavailable.", res.error);
        return;
      }

      const delivered = res.value;
      if (!delivered || delivered.length === 0) return;

      const entities: NotificationEntity[] = [];
      for (const payload of delivered as any[]) {
        if (isEmptySystemPlaceholderPayload(payload)) continue;
        const entity = mapInboundPushToNotification(uid, payload);
        if (entity) entities.push(entity);
      }
      if (entities.length === 0) return;

      await handlers.onBatchReceived(uid, entities);
    });
  }
}

export const nativePushService = new NativePushService();
