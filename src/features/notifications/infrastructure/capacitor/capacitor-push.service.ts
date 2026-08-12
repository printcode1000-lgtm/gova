"use client";

import {
  localNotifications,
  pushNotifications,
  type NotificationPayload,
} from "@/native-platform/notifications";
import type { Unsubscribe } from "@/native-platform";
import type { DeviceToken, NotificationEntity } from "../../domain/entities";
import {
  isEmptySystemPlaceholderPayload,
  mapInboundPushToNotification,
} from "../../domain/inbound-notification-mapper";
import { NotificationError, NotificationErrorCodes } from "../../domain/notification-error";
import { notificationLog } from "../../domain/notification-redaction";
import { isDataOnlyDelivery } from "../../domain/notification-visibility";
import { resolvePushProvider } from "../../domain/push-token-kind";
import { assertUid } from "../../domain/notification-validation";
import { readNotificationLocale } from "../../shared/read-notification-locale";
import { SingleFlight } from "../../shared/keyed-mutex";
import { asolNotificationRepository } from "../asol-notification-repository";
import { pushDeviceStore } from "../push-device-store";
import { capacitorLocalNotificationService } from "./capacitor-local-notification.service";
import { capacitorPlatformService } from "./capacitor-platform.service";

/**
 * The FCM/APNs adapter.
 *
 * It owns the plugin: listeners, registration, channels, and the delivered-tray
 * inbox. It does not decide what a notification means or where it is stored —
 * it maps a payload through the domain mapper and hands the result to the
 * callbacks the application layer installed.
 *
 * Imports are single-flight per user. `initialize` and the resume listener both
 * import the tray, and on a cold start from a notification tap they fire in the
 * same tick; without coalescing the same delivered notification is mapped and
 * offered twice, and the exactly-once guarantee would rest on storage dedupe
 * alone rather than on not doing the work twice.
 */

/**
 * What the application layer does with an inbound notification.
 *
 * @returns whether this call stored a new notification. The adapter presents a
 * banner only for a `true`: Firebase re-delivers, and a duplicate that is not
 * stored a second time must not ring a second time either.
 */
export type ReceivedHandler = (
  notification: NotificationEntity,
) => Promise<boolean> | boolean;

/** A batch from the tray. Returns what was newly stored, for acknowledgement. */
export type BatchReceivedHandler = (
  uid: string,
  notifications: readonly NotificationEntity[],
) => Promise<readonly NotificationEntity[]> | readonly NotificationEntity[];

export type ActionHandler = (notification: NotificationEntity) => Promise<void> | void;

export interface CapacitorPushHandlers {
  onReceived: ReceivedHandler;
  onBatchReceived: BatchReceivedHandler;
  onAction: ActionHandler;
}

export class CapacitorPushService {
  private currentUid = "";
  private listenersReady = false;
  private listeners: Unsubscribe[] = [];
  private handlers: CapacitorPushHandlers | null = null;
  private readonly imports = new SingleFlight();

  isAndroid(): boolean {
    return (
      capacitorPlatformService.isNative() &&
      capacitorPlatformService.getPlatform() === "android"
    );
  }

  isNativePush(): boolean {
    const platform = capacitorPlatformService.getPlatform();
    return (
      capacitorPlatformService.isNative() && (platform === "android" || platform === "ios")
    );
  }

  getPlatform(): "android" | "ios" | "web" {
    return capacitorPlatformService.getPlatform();
  }

  async initialize(uid: string, handlers: CapacitorPushHandlers): Promise<void> {
    if (!this.isNativePush()) return;
    this.currentUid = assertUid(uid);
    this.handlers = handlers;
    await this.ensureListeners();
    await this.createChannels();
    await this.importDelivered();
  }

  /** Import notifications the OS displayed while this WebView was inactive. */
  async syncDeliveredNotifications(): Promise<void> {
    if (!this.isNativePush()) return;
    await this.importDelivered();
  }

  async register(uid: string): Promise<DeviceToken | null> {
    if (!this.isNativePush()) return null;
    const platform = capacitorPlatformService.getPlatform();
    if (platform !== "android" && platform !== "ios") return null;
    this.currentUid = assertUid(uid);
    await this.ensureListeners();

    const permission = await pushNotifications.checkPermission();
    if (!permission.granted) {
      throw new NotificationError(
        NotificationErrorCodes.PermissionDenied,
        "notificationPermissionDenied",
      );
    }
    await this.createChannels();

    // The Native Platform module owns the registration handshake and its
    // timeout. The provider's own error text is never surfaced: it can carry a
    // token or a credential hint.
    const tokenValue = await pushNotifications
      .register()
      .then((token) => token.value)
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "";
        notificationLog.warn("Push registration failed.", error);
        throw new NotificationError(
          NotificationErrorCodes.DeliveryFailed,
          message.includes("timed out")
            ? "notificationRegistrationTimeout"
            : "notificationPermissionDenied",
        );
      });

    const now = new Date().toISOString();
    const deviceId = await pushDeviceStore.deviceId(platform);
    await pushDeviceStore.setEnabled(platform, true);
    return {
      id: `ntok_${this.currentUid}_${platform}_${deviceId}`.replace(/[^a-zA-Z0-9_:-]/g, "_"),
      uid: this.currentUid,
      platform,
      // Classified from the token itself: Apple yields an FCM token once the
      // Firebase iOS SDK is installed, and a raw APNs token until then.
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

  async isEnabled(): Promise<boolean> {
    if (!this.isNativePush()) return false;
    const platform = capacitorPlatformService.getPlatform();
    if (platform !== "android" && platform !== "ios") return false;
    return pushDeviceStore.isEnabled(platform);
  }

  async unregister(): Promise<void> {
    if (!this.isNativePush()) return;
    const platform = capacitorPlatformService.getPlatform();
    if (platform !== "android" && platform !== "ios") return;
    // The user is signing out or opting out, so the tray is cleared too: those
    // notifications belong to a session that no longer exists.
    await pushNotifications.unregister();
    await pushNotifications.removeAllDelivered();
    await pushDeviceStore.setEnabled(platform, false);
    this.currentUid = "";
  }

  async permissionState(): Promise<"granted" | "denied" | "prompt" | "unsupported"> {
    if (!this.isNativePush()) return "unsupported";
    const result = await pushNotifications.checkPermission();
    if (result.state === "unsupported") return "unsupported";
    if (result.granted) return "granted";
    return result.state === "denied" || result.state === "blocked" ? "denied" : "prompt";
  }

  /**
   * Android channels are declared once in the Native Platform module so the ids,
   * names, and sound stay identical to already-installed clients.
   *
   * Safe to call repeatedly and on every platform: creating a channel that
   * exists is a no-op, and nothing happens off Android.
   */
  async createChannels(): Promise<void> {
    if (!this.isAndroid()) return;
    // On affected Android/OEM builds a channel created before the runtime
    // notification grant is persisted with sound=null. Sound is immutable, so
    // a later call cannot repair it; defer creation until after explicit opt-in.
    if ((await this.permissionState()) !== "granted") return;
    await pushNotifications.createChannels();
  }

  private async ensureListeners(): Promise<void> {
    if (this.listenersReady) return;
    this.listenersReady = true;
    await pushNotifications.ensureListeners();
    await localNotifications.ensureListeners();

    this.listeners.push(
      pushNotifications.onReceived((native) => {
        void this.handleReceived(native);
      }),
      pushNotifications.onAction((native) => {
        void this.handleAction(native);
      }),
      // A notification this device displayed itself is tapped through the local
      // plugin, not the push plugin. Both carry the same flat payload, so both
      // route identically.
      localNotifications.onAction((native) => {
        void this.handleAction(native);
      }),
    );
  }

  private mapForCurrentUser(native: NotificationPayload): NotificationEntity | null {
    if (!this.currentUid) return null;
    return mapInboundPushToNotification(this.currentUid, native);
  }

  private async handleReceived(native: NotificationPayload): Promise<void> {
    const entity = this.mapForCurrentUser(native);
    if (!entity) return;
    try {
      const stored = await this.handlers?.onReceived(entity);
      // Presentation follows persistence. A duplicate delivery stores nothing,
      // so it shows nothing — that is what makes "exactly one banner" true for
      // a push Firebase sends twice.
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
   * Show a foreground push on Android.
   *
   * Firebase suppresses its own tray notification while the application is
   * visible and hands the message straight to JavaScript, so without this an
   * Android user gets no banner and no sound for anything arriving while the app
   * is open. iOS presents it itself from the configured `presentationOptions`,
   * so doing it there too would show it twice.
   *
   * Failures are swallowed: a missing banner must never break the stored
   * notification, which the receive handler has already committed.
   */
  private async presentForeground(entity: NotificationEntity): Promise<void> {
    if (!this.isAndroid()) return;
    if (isDataOnlyDelivery(entity)) return;
    try {
      // The same rule the tray import and the service worker follow: a
      // notification the user deleted is not brought back by a re-delivery of
      // the event that produced it.
      const dismissed = new Set(await asolNotificationRepository.listDismissed(entity.uid));
      if (dismissed.has(entity.id) || dismissed.has(entity.dedupeKey)) return;
      await capacitorLocalNotificationService.display(entity);
    } catch (error) {
      notificationLog.warn("Foreground display failed.", error);
    }
  }

  /**
   * Read the delivered tray and hand everything usable to the batch handler.
   *
   * Single-flight per user: `initialize` and the resume listener both call this,
   * and a cold start from a tap fires them together.
   */
  private async importDelivered(): Promise<void> {
    const uid = this.currentUid;
    const handlers = this.handlers;
    if (!uid || !handlers) return;

    await this.imports.run(`import:${uid}`, async () => {
      let delivered: NotificationPayload[];
      try {
        delivered = await pushNotifications.getDelivered();
      } catch (error) {
        // A plugin that is unavailable — an old shell, a platform without the
        // inbox — must not break startup.
        notificationLog.warn("Delivered-notification inbox is unavailable.", error);
        return;
      }

      const entities: NotificationEntity[] = [];
      for (const payload of delivered) {
        if (isEmptySystemPlaceholderPayload(payload)) continue;
        const entity = mapInboundPushToNotification(uid, payload);
        if (entity) entities.push(entity);
      }
      if (entities.length === 0) return;

      // The batch handler persists and reports what was actually new. Nothing is
      // acknowledged here on its own: the durable record of "already imported"
      // is the stored notification and the dismissed list, both written before
      // this returns.
      await handlers.onBatchReceived(uid, entities);
    });
  }
}

export const capacitorPushService = new CapacitorPushService();
