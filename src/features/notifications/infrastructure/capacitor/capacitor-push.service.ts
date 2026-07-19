"use client";

import {
  PushNotifications,
  type ActionPerformed,
  type PushNotificationSchema,
} from "@capacitor/push-notifications";
import type { PluginListenerHandle } from "@capacitor/core";
import { ASOL_DB_STORES, asolDbGet, asolDbSet } from "@/lib/asol-db";
import { asolNotificationRepository } from "../asol-notification-repository";
import type { DeviceToken, NotificationEntity } from "../../domain/entities";
import {
  NotificationCategories,
  NotificationChannels,
  NotificationContentSources,
  NotificationDeliveryStatuses,
  NotificationPriorities,
  NotificationSounds,
  NotificationSyncStates,
  NotificationTargets,
  NotificationTypes,
  type NotificationCategory,
  type NotificationPriority,
  type NotificationSound,
} from "../../domain/enums";
import { capacitorPlatformService } from "./capacitor-platform.service";

const DEVICE_ID_KEY = "android-push-device-id";
const ENABLED_KEY = "android-push-enabled";
const REGISTRATION_TIMEOUT_MS = 20_000;

type ReceivedHandler = (
  notification: NotificationEntity,
) => Promise<void> | void;
type ActionHandler = (notification: NotificationEntity) => Promise<void> | void;

function isCategory(value: unknown): value is NotificationCategory {
  return Object.values(NotificationCategories).includes(
    value as NotificationCategory,
  );
}

function isPriority(value: unknown): value is NotificationPriority {
  return Object.values(NotificationPriorities).includes(
    value as NotificationPriority,
  );
}

function isSound(value: unknown): value is NotificationSound {
  return Object.values(NotificationSounds).includes(value as NotificationSound);
}

function dataString(data: Record<string, unknown>, key: string): string {
  return typeof data[key] === "string" ? data[key].trim() : "";
}

function safeInternalRoute(value: string): string | undefined {
  return value.startsWith("/") && !value.startsWith("//") ? value : undefined;
}

function fallbackNotificationKey(native: PushNotificationSchema): string {
  const data = (native.data ?? {}) as Record<string, unknown>;
  const title = native.title || dataString(data, "title") || "ASOL";
  const body = native.body || dataString(data, "body");
  const route = dataString(data, "routeHref");
  return `push:${title}:${body}:${route}`;
}

function isEmptySystemPlaceholder(native: PushNotificationSchema): boolean {
  const data = (native.data ?? {}) as Record<string, unknown>;
  const hasData = Object.values(data).some(
    (value) => value !== null && value !== undefined && String(value).trim(),
  );
  const title = native.title || dataString(data, "title") || "";
  const body = native.body || dataString(data, "body");
  return !hasData && title.toUpperCase() === "ASOL" && !body;
}

function toNotificationEntity(
  uid: string,
  native: PushNotificationSchema,
): NotificationEntity {
  const data = (native.data ?? {}) as Record<string, unknown>;
  const now = new Date().toISOString();
  const id =
    dataString(data, "notificationId") || native.id || fallbackNotificationKey(native);
  const routeHref = safeInternalRoute(dataString(data, "routeHref"));
  const categoryValue = dataString(data, "category");
  const priorityValue = dataString(data, "priority");
  const soundValue = dataString(data, "sound");
  return {
    id,
    uid,
    type: dataString(data, "templateId")
      ? NotificationTypes.Template
      : NotificationTypes.Custom,
    source: NotificationContentSources.Custom,
    templateId: dataString(data, "templateId") || undefined,
    title: native.title || dataString(data, "title") || "ASOL",
    body: native.body || dataString(data, "body"),
    category: isCategory(categoryValue)
      ? categoryValue
      : NotificationCategories.System,
    priority: isPriority(priorityValue)
      ? priorityValue
      : NotificationPriorities.Normal,
    channels: [NotificationChannels.InApp, NotificationChannels.AndroidPush],
    targets: [NotificationTargets.Center, NotificationTargets.Badge],
    route: routeHref
      ? {
          href: routeHref,
          label: dataString(data, "routeLabel") || undefined,
        }
      : undefined,
    groupKey: dataString(data, "groupKey") || undefined,
    dedupeKey: dataString(data, "dedupeKey") || id,
    sound: isSound(soundValue) ? soundValue : NotificationSounds.Default,
    status: NotificationDeliveryStatuses.Delivered,
    syncState: NotificationSyncStates.Synced,
    displayedAt: now,
    createdAt: dataString(data, "createdAt") || now,
    updatedAt: now,
    metadata: Object.fromEntries(
      Object.entries(data)
        .filter(([key]) => key.startsWith("meta_"))
        .map(([key, value]) => [key.slice(5), String(value)]),
    ),
  };
}

async function getDeviceId(): Promise<string> {
  const existing = await asolDbGet<string>(
    ASOL_DB_STORES.APP_SETTINGS,
    DEVICE_ID_KEY,
  );
  if (existing) return existing;
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}:${Math.random().toString(36).slice(2)}`;
  const generated = `android:${randomId}`;
  await asolDbSet(ASOL_DB_STORES.APP_SETTINGS, DEVICE_ID_KEY, generated);
  return generated;
}

export class CapacitorPushService {
  private currentUid = "";
  private listenersReady = false;
  private listeners: PluginListenerHandle[] = [];
  private receivedHandler: ReceivedHandler | null = null;
  private actionHandler: ActionHandler | null = null;
  private registrationResolve: ((token: string) => void) | null = null;
  private registrationReject: ((error: Error) => void) | null = null;

  isAndroid(): boolean {
    return (
      capacitorPlatformService.isNative() &&
      capacitorPlatformService.getPlatform() === "android"
    );
  }

  getPlatform(): "android" | "ios" | "web" {
    return capacitorPlatformService.getPlatform();
  }

  async initialize(
    uid: string,
    handlers: { onReceived: ReceivedHandler; onAction: ActionHandler },
  ): Promise<void> {
    if (!this.isAndroid()) return;
    this.currentUid = uid;
    this.receivedHandler = handlers.onReceived;
    this.actionHandler = handlers.onAction;
    await this.ensureListeners();
    await this.createChannels();
    await this.importDeliveredNotifications();
  }

  async register(uid: string): Promise<DeviceToken | null> {
    if (!this.isAndroid()) return null;
    this.currentUid = uid;
    await this.ensureListeners();
    await this.createChannels();
    const permission = await PushNotifications.checkPermissions();
    if (permission.receive !== "granted")
      throw new Error("notificationPermissionDenied");

    const tokenValue = await new Promise<string>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        this.registrationResolve = null;
        this.registrationReject = null;
        reject(new Error("notificationRegistrationTimeout"));
      }, REGISTRATION_TIMEOUT_MS);
      this.registrationResolve = (value) => {
        window.clearTimeout(timeout);
        this.registrationResolve = null;
        this.registrationReject = null;
        resolve(value);
      };
      this.registrationReject = (error) => {
        window.clearTimeout(timeout);
        this.registrationResolve = null;
        this.registrationReject = null;
        reject(error);
      };
      void PushNotifications.register().catch(this.registrationReject);
    });

    const now = new Date().toISOString();
    const deviceId = await getDeviceId();
    await asolDbSet(ASOL_DB_STORES.APP_SETTINGS, ENABLED_KEY, true);
    return {
      id: `ntok_${uid}_android_${deviceId}`.replace(/[^a-zA-Z0-9_:-]/g, "_"),
      uid,
      platform: "android",
      provider: "fcm",
      deviceId,
      token: tokenValue,
      deviceLabel: "ASOL Android",
      enabled: true,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    };
  }

  async isEnabled(): Promise<boolean> {
    if (!this.isAndroid()) return false;
    return (
      (await asolDbGet<boolean>(ASOL_DB_STORES.APP_SETTINGS, ENABLED_KEY)) ===
      true
    );
  }

  async unregister(): Promise<void> {
    if (!this.isAndroid()) return;
    await PushNotifications.unregister().catch(() => undefined);
    await PushNotifications.removeAllDeliveredNotifications().catch(
      () => undefined,
    );
    await asolDbSet(ASOL_DB_STORES.APP_SETTINGS, ENABLED_KEY, false);
  }

  async permissionState(): Promise<
    "granted" | "denied" | "prompt" | "unsupported"
  > {
    if (!this.isAndroid()) return "unsupported";
    const result = await PushNotifications.checkPermissions();
    return result.receive === "prompt-with-rationale"
      ? "prompt"
      : result.receive;
  }

  private async ensureListeners(): Promise<void> {
    if (this.listenersReady) return;
    this.listenersReady = true;
    this.listeners.push(
      await PushNotifications.addListener("registration", ({ value }) => {
        this.registrationResolve?.(value);
      }),
      await PushNotifications.addListener("registrationError", ({ error }) => {
        this.registrationReject?.(new Error(error));
      }),
      await PushNotifications.addListener(
        "pushNotificationReceived",
        (native) => {
          if (!this.currentUid) return;
          void this.receivedHandler?.(
            toNotificationEntity(this.currentUid, native),
          );
        },
      ),
      await PushNotifications.addListener(
        "pushNotificationActionPerformed",
        (action: ActionPerformed) => {
          if (!this.currentUid) return;
          void this.actionHandler?.(
            toNotificationEntity(this.currentUid, action.notification),
          );
        },
      ),
    );
  }

  private async createChannels(): Promise<void> {
    const sound = "custom_notification.mp3";
    await Promise.all([
      PushNotifications.createChannel({
        id: "asol_general_v2",
        name: "ASOL - الإشعارات العامة",
        description: "الإشعارات العامة من أصول",
        importance: 4,
        visibility: 0,
        vibration: true,
        sound,
      }),
      PushNotifications.createChannel({
        id: "asol_orders_v2",
        name: "ASOL - الطلبات",
        description: "تحديثات الطلبات والشحن والإرجاع",
        importance: 4,
        visibility: 0,
        vibration: true,
        sound,
      }),
      PushNotifications.createChannel({
        id: "asol_chat_v2",
        name: "ASOL - المحادثات",
        description: "الرسائل والمحادثات الجديدة",
        importance: 4,
        visibility: 0,
        vibration: true,
        sound,
      }),
      PushNotifications.createChannel({
        id: "asol_urgent_v2",
        name: "ASOL - التنبيهات المهمة",
        description: "التنبيهات العاجلة والمهمة",
        importance: 5,
        visibility: 0,
        vibration: true,
        sound,
      }),
      PushNotifications.createChannel({
        id: "asol_updates_v2",
        name: "ASOL - التحديثات",
        description: "إشعارات التحديثات العامة من أصول",
        importance: 4,
        visibility: 0,
        vibration: true,
        sound,
      }),
    ]);
  }

  private async importDeliveredNotifications(): Promise<void> {
    if (!this.currentUid || !this.receivedHandler) return;
    const delivered = await PushNotifications.getDeliveredNotifications();
    const dismissed = new Set(
      await asolNotificationRepository.listDismissed(this.currentUid),
    );
    for (const notification of delivered.notifications) {
      if (isEmptySystemPlaceholder(notification)) continue;
      const entity = toNotificationEntity(this.currentUid, notification);
      if (dismissed.has(entity.id) || dismissed.has(entity.dedupeKey)) continue;
      await this.receivedHandler(entity);
    }
  }
}

export const capacitorPushService = new CapacitorPushService();
