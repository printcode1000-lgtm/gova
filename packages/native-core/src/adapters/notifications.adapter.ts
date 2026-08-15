import { registerPlugin } from "@capacitor/core";
import { createLazyPlugin } from "./lazy-plugin";
import { toNativeCoreError, NativeCoreError } from "../errors/native-core-error";
import { createEmitter, removeHandles, type PluginHandle } from "./emitter";
import { isAndroid, isNativePlatform, getPlatformName } from "./platform.adapter";
import { permissionsAdapter } from "./permissions.adapter";
import { PermissionKinds, type PermissionResult } from "../domain/permissions/permission-kinds";
import type {
  PushToken,
  PushTokenListener,
  NotificationPayload,
  NotificationListener,
  NotificationActionListener,
  NotificationInboxRecord,
  NotificationInboxTap,
  NotificationTapListener,
  LocalNotificationSchedule,
} from "../domain/notifications/types";
import { DEFAULT_CHANNEL_ID } from "../domain/notifications/channel-constants";
import type { Unsubscribe } from "../domain/listener";

const MODULE = "Notifications";
const REGISTRATION_TIMEOUT_MS = 20_000;

interface NativeNotification {
  id?: string;
  tag?: string;
  channelId?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}

interface NativeInboxRecord {
  recordId?: string;
  uid?: string;
  notificationId?: string;
  dedupeKey?: string;
  channelId?: string;
  createdAt?: string;
  receivedAt?: number;
  payload?: NativeNotification;
}

interface NotificationInboxPluginApi {
  ensureChannels: () => Promise<void>;
  getDelivered: () => Promise<{ notifications: NativeNotification[] }>;
  listPending: (options: { uid: string }) => Promise<{ records: NativeInboxRecord[] }>;
  acknowledge: (options: { uid: string; recordIds: string[] }) => Promise<{ acknowledged: number }>;
  clearPending: () => Promise<void>;
  getPendingCount: () => Promise<{ count: number }>;
  getPendingTap: () => Promise<{
    recordId?: string;
    uid?: string;
    notificationId?: string;
    record?: NativeInboxRecord;
  }>;
  clearPendingTap: () => Promise<void>;
  addListener: (event: string, callback: (data: never) => void) => Promise<PluginHandle>;
}

interface PushPluginApi {
  register: () => Promise<void>;
  unregister: () => Promise<void>;
  createChannel: (channel: Record<string, unknown>) => Promise<void>;
  getDeliveredNotifications: () => Promise<{ notifications: NativeNotification[] }>;
  removeAllDeliveredNotifications: () => Promise<void>;
  addListener: (event: string, callback: (data: never) => void) => Promise<PluginHandle>;
}

interface LocalNotificationsApi {
  schedule: (options: Record<string, unknown>) => Promise<unknown>;
  cancel: (options: { notifications: Array<{ id: number }> }) => Promise<void>;
  removeAllDeliveredNotifications: () => Promise<void>;
  getPending: () => Promise<{ notifications: Array<{ id: number }> }>;
  addListener?: (event: string, callback: (data: never) => void) => Promise<PluginHandle>;
}

const notificationInboxPlugin = registerPlugin<NotificationInboxPluginApi>("AsolNotificationInbox");

const pushPlugin = createLazyPlugin("PushNotifications", async () => {
  const { PushNotifications } = await import("@capacitor/push-notifications");
  return { plugin: PushNotifications as unknown as PushPluginApi };
});

const localPlugin = createLazyPlugin("LocalNotifications", async () => {
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  return { plugin: LocalNotifications as unknown as LocalNotificationsApi };
});

function isNotificationWebViewForeground(): boolean {
  if (typeof document === "undefined") return false;
  return document.visibilityState === "visible";
}

function toPayload(native: NativeNotification, foreground = false): NotificationPayload {
  const rawData = native.data ?? {};
  return {
    id: native.tag || native.id || `push_${Date.now()}`,
    title: native.title ?? "",
    body: native.body ?? "",
    data: Object.fromEntries(
      Object.entries(rawData).map(([key, value]) => [key, String(value ?? "")]),
    ),
    foreground,
    tag: native.tag,
    channelId: native.channelId,
  };
}

function toInboxRecord(native: NativeInboxRecord): NotificationInboxRecord | null {
  const recordId = typeof native.recordId === "string" ? native.recordId.trim() : "";
  if (!recordId) return null;
  return {
    recordId,
    uid: typeof native.uid === "string" ? native.uid.trim() : "",
    notificationId: typeof native.notificationId === "string" ? native.notificationId : "",
    dedupeKey: typeof native.dedupeKey === "string" ? native.dedupeKey : "",
    channelId: typeof native.channelId === "string" ? native.channelId : "",
    createdAt: typeof native.createdAt === "string" ? native.createdAt : "",
    receivedAt: typeof native.receivedAt === "number" ? native.receivedAt : 0,
    payload: toPayload(native.payload ?? {}, false),
  };
}

export class NotificationsAdapter {
  private handles: PluginHandle[] = [];
  private listenersReady = false;
  private tapListenerReady = false;

  private readonly tokens = createEmitter<PushToken>("push:token");
  private readonly received = createEmitter<NotificationPayload>("push:received");
  private readonly actions = createEmitter<NotificationPayload>("push:action");
  private readonly taps = createEmitter<NotificationInboxTap>("push:tap");

  private pendingResolve: ((token: string) => void) | null = null;
  private pendingReject: ((error: Error) => void) | null = null;

  isPushSupported(): boolean {
    const platform = getPlatformName();
    return isNativePlatform() && (platform === "android" || platform === "ios");
  }

  async registerForPush(): Promise<PushToken> {
    if (!this.isPushSupported()) {
      throw NativeCoreError.unavailable(MODULE, "Push is not supported on this platform.");
    }

    if (isAndroid()) {
      await this.ensureChannels();
    }

    const plugin = (await pushPlugin.required()).plugin;
    await this.ensureListeners();

    const value = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingResolve = null;
        this.pendingReject = null;
        reject(new Error("Push registration timed out."));
      }, REGISTRATION_TIMEOUT_MS);

      this.pendingResolve = (token) => {
        clearTimeout(timer);
        this.pendingResolve = null;
        this.pendingReject = null;
        resolve(token);
      };
      this.pendingReject = (error) => {
        clearTimeout(timer);
        this.pendingResolve = null;
        this.pendingReject = null;
        reject(error);
      };

      void plugin.register().catch((error) => this.pendingReject?.(error));
    });

    const platform = getPlatformName();
    return {
      value,
      platform,
      provider: platform === "ios" ? "apns" : "fcm",
    };
  }

  async unregisterPush(): Promise<void> {
    if (!this.isPushSupported()) return;
    const plugin = (await pushPlugin.required()).plugin;
    await plugin.unregister().catch(() => {});
  }

  async getDeliveredPush(): Promise<NotificationPayload[]> {
    if (!this.isPushSupported()) return [];
    const { notifications } = isAndroid()
      ? await notificationInboxPlugin.getDelivered()
      : await (await pushPlugin.required()).plugin.getDeliveredNotifications();
    return notifications.map((n) => toPayload(n, false));
  }

  async removeAllDelivered(): Promise<void> {
    if (!this.isPushSupported()) return;
    const plugin = (await pushPlugin.required()).plugin;
    await plugin.removeAllDeliveredNotifications().catch(() => {});
  }

  async ensureChannels(): Promise<void> {
    if (!isAndroid()) return;
    await notificationInboxPlugin.ensureChannels();
  }

  async listPendingInbox(uid: string): Promise<NotificationInboxRecord[]> {
    if (!isAndroid() || !uid) return [];
    const { records } = await notificationInboxPlugin.listPending({ uid });
    return records
      .map(toInboxRecord)
      .filter((r): r is NotificationInboxRecord => r !== null);
  }

  async acknowledgeInbox(uid: string, recordIds: readonly string[]): Promise<number> {
    if (!isAndroid() || !uid || recordIds.length === 0) return 0;
    const { acknowledged } = await notificationInboxPlugin.acknowledge({
      uid,
      recordIds: [...recordIds],
    });
    return typeof acknowledged === "number" ? acknowledged : 0;
  }

  async clearInbox(): Promise<void> {
    if (!isAndroid()) return;
    await notificationInboxPlugin.clearPending();
  }

  async pendingInboxCount(): Promise<number> {
    if (!isAndroid()) return 0;
    const { count } = await notificationInboxPlugin.getPendingCount();
    return typeof count === "number" ? count : 0;
  }

  async getInboxTap(): Promise<NotificationInboxTap | null> {
    if (!isAndroid()) return null;
    const tap = await notificationInboxPlugin.getPendingTap();
    const recordId = typeof tap.recordId === "string" ? tap.recordId.trim() : "";
    if (!recordId) return null;
    const record = tap.record ? toInboxRecord(tap.record) : null;
    const notificationId =
      typeof tap.notificationId === "string" && tap.notificationId.trim()
        ? tap.notificationId.trim()
        : record?.notificationId ?? "";
    return {
      recordId,
      uid: typeof tap.uid === "string" ? tap.uid.trim() : "",
      notificationId,
      ...(record ? { record } : {}),
    };
  }

  async clearInboxTap(): Promise<void> {
    if (!isAndroid()) return;
    await notificationInboxPlugin.clearPendingTap();
  }

  onInboxTap(listener: NotificationTapListener): Unsubscribe {
    return this.taps.add(listener);
  }

  async ensureInboxTapListener(): Promise<void> {
    if (this.tapListenerReady || !isAndroid()) return;
    this.tapListenerReady = true;
    this.handles.push(
      await notificationInboxPlugin.addListener("notificationTapped", ((tap: {
        recordId?: string;
        uid?: string;
        notificationId?: string;
      }) => {
        const recordId = typeof tap?.recordId === "string" ? tap.recordId.trim() : "";
        if (!recordId) return;
        this.taps.emit({
          recordId,
          uid: typeof tap.uid === "string" ? tap.uid.trim() : "",
          notificationId: typeof tap.notificationId === "string" ? tap.notificationId.trim() : "",
        });
      }) as (data: never) => void),
    );
  }

  async checkPermission(): Promise<PermissionResult> {
    return permissionsAdapter.check(PermissionKinds.Notifications);
  }

  async createChannels(): Promise<void> {
    return this.ensureChannels();
  }

  async register(): Promise<PushToken> {
    return this.registerForPush();
  }

  async unregister(): Promise<void> {
    return this.unregisterPush();
  }

  async getDelivered(): Promise<NotificationPayload[]> {
    return this.getDeliveredPush();
  }

  async schedule(schedule: LocalNotificationSchedule): Promise<void> {
    return this.scheduleLocal(schedule);
  }

  onTap(listener: NotificationTapListener): Unsubscribe {
    return this.onInboxTap(listener);
  }

  onToken(listener: PushTokenListener): Unsubscribe {
    return this.tokens.add(listener);
  }

  onReceived(listener: NotificationListener): Unsubscribe {
    return this.received.add(listener);
  }

  onAction(listener: NotificationActionListener): Unsubscribe {
    return this.actions.add(listener);
  }

  async ensureListeners(): Promise<void> {
    if (this.listenersReady || !this.isPushSupported()) return;
    this.listenersReady = true;

    const plugin = (await pushPlugin.required()).plugin;
    this.handles.push(
      await plugin.addListener("registration", ((token: { value: string }) => {
        this.pendingResolve?.(token.value);
        const platform = getPlatformName();
        this.tokens.emit({
          value: token.value,
          platform,
          provider: platform === "ios" ? "apns" : "fcm",
        });
      }) as (data: never) => void),

      await plugin.addListener("registrationError", ((error: { error: string }) => {
        this.pendingReject?.(new Error(error.error));
      }) as (data: never) => void),

      await plugin.addListener("pushNotificationReceived", ((native: NativeNotification) => {
        this.received.emit(toPayload(native, isNotificationWebViewForeground()));
      }) as (data: never) => void),

      await plugin.addListener("pushNotificationActionPerformed", ((action: { notification: NativeNotification }) => {
        this.actions.emit(toPayload(action.notification, false));
      }) as (data: never) => void),
    );
  }

  // ---- Local notifications ----

  async scheduleLocal(schedule: LocalNotificationSchedule): Promise<void> {
    if (isNativePlatform()) {
      try {
        const plugin = (await localPlugin.required()).plugin;
        await plugin.schedule({
          notifications: [
            {
              id: schedule.id,
              title: schedule.title,
              body: schedule.body,
              ...(schedule.at ? { schedule: { at: schedule.at } } : {}),
              ...(isAndroid() ? { channelId: schedule.channelId ?? DEFAULT_CHANNEL_ID } : {}),
              ...(schedule.sound ? { sound: schedule.sound } : {}),
              ...(schedule.badge !== undefined ? { badge: schedule.badge } : {}),
              ...(schedule.data ? { extra: schedule.data } : {}),
            },
          ],
        });
      } catch (error) {
        throw toNativeCoreError(MODULE, error);
      }
      return;
    }

    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      const delay = schedule.at ? schedule.at.getTime() - Date.now() : 0;
      const show = () => {
        new Notification(schedule.title, {
          body: schedule.body,
          tag: String(schedule.id),
        });
      };
      if (delay <= 0) show();
      else setTimeout(show, delay);
    }
  }

  async cancelLocal(id: number): Promise<void> {
    if (isNativePlatform()) {
      const plugin = (await localPlugin.required()).plugin;
      await plugin.cancel({ notifications: [{ id }] }).catch(() => {});
    }
  }

  async cancelAllLocal(): Promise<void> {
    if (isNativePlatform()) {
      const plugin = (await localPlugin.required()).plugin;
      const { notifications } = await plugin.getPending();
      if (notifications.length > 0) {
        await plugin.cancel({ notifications }).catch(() => {});
      }
    }
  }

  async setBadge(count: number): Promise<void> {
    if (typeof navigator !== "undefined") {
      const nav = navigator as any;
      try {
        if (count <= 0) await nav.clearAppBadge?.();
        else await nav.setAppBadge?.(count);
      } catch {}
    }
  }

  async clearBadge(): Promise<void> {
    await this.setBadge(0);
  }

  async dispose(): Promise<void> {
    await removeHandles(this.handles);
    this.handles = [];
    this.listenersReady = false;
    this.tapListenerReady = false;
    this.tokens.clear();
    this.received.clear();
    this.actions.clear();
    this.taps.clear();
  }
}

export const notificationsAdapter = new NotificationsAdapter();
