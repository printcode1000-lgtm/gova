/**
 * Local (device-scheduled) notifications.
 *
 * Single responsibility: schedule, cancel, and badge. Distinct from push,
 * which is a network transport with its own registration lifecycle.
 *
 * Falls back to the Web Notification API in the browser, where scheduling is
 * emulated with a timer for the current page lifetime only.
 */

import { toNativeError } from "../core/errors";
import {
  createEmitter,
  removeHandles,
  type PluginHandle,
} from "../core/listener";
import { createLazyPlugin } from "../core/lazy-plugin";
import { hasDom, isAndroid, isNativePlatform } from "../core/platform";
import { localNotificationAdapter } from "../permissions/permission-adapters";
import { permissionManager } from "../permissions/permission-manager";
import type { PermissionResult } from "../permissions/types";
import {
  DEFAULT_CHANNEL_ID,
  DEFAULT_CHANNELS,
  type LocalNotificationSchedule,
  type NotificationActionListener,
  type NotificationPayload,
} from "./types";

const MODULE = "LocalNotifications";

interface NativeLocalNotification {
  id?: number;
  title?: string;
  body?: string;
  extra?: Record<string, unknown> | null;
}

interface LocalNotificationsApi {
  schedule: (options: Record<string, unknown>) => Promise<unknown>;
  cancel: (options: { notifications: Array<{ id: number }> }) => Promise<void>;
  removeAllDeliveredNotifications: () => Promise<void>;
  getPending: () => Promise<{ notifications: Array<{ id: number }> }>;
  createChannel?: (channel: Record<string, unknown>) => Promise<void>;
  addListener?: (
    event: string,
    callback: (data: never) => void,
  ) => Promise<PluginHandle>;
}

/**
 * Normalized to the same shape a push payload uses, so a caller can read a
 * tapped local notification with the same code that reads a tapped push.
 */
function toPayload(native: NativeLocalNotification): NotificationPayload {
  const extra = (native.extra ?? {}) as Record<string, unknown>;
  const data = Object.fromEntries(
    Object.entries(extra).map(([key, value]) => [key, String(value ?? "")]),
  );
  return {
    id: data.notificationId || String(native.id ?? ""),
    title: native.title ?? "",
    body: native.body ?? "",
    data,
    // The application was showing when it was scheduled, but the tap is a
    // deliberate action taken later — same meaning as a tapped push.
    foreground: false,
  };
}

const localPlugin = createLazyPlugin(MODULE, async () => {
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  // Boxed: returning the proxy itself would make this promise call its
  // then() on the native bridge.
  return { plugin: LocalNotifications as unknown as LocalNotificationsApi };
});

/** Browser timers standing in for OS scheduling. */
const webTimers = new Map<number, ReturnType<typeof setTimeout>>();

export class LocalNotificationsModule {
  private handles: PluginHandle[] = [];
  private listenersReady = false;
  private readonly actions =
    createEmitter<NotificationPayload>("local:action");

  /** Ask for permission. Call only when the user opts in. */
  requestPermission(): Promise<PermissionResult> {
    return permissionManager.requestLocalNotificationsIfNeeded();
  }

  /**
   * True when the OS will actually display a local notification.
   * Never prompts.
   */
  async isPermitted(): Promise<boolean> {
    if (isNativePlatform()) {
      const result = await localNotificationAdapter().check();
      // A platform with no such permission concept still displays.
      return result === "granted" || result === "unsupported";
    }
    if (!hasDom() || !("Notification" in window)) return false;
    return Notification.permission === "granted";
  }

  /**
   * Schedule a notification. Delivers immediately when `at` is omitted.
   *
   * Exits quietly when permission is absent: a local notification is a
   * convenience, never a critical operation, and this module must not prompt.
   */
  async schedule(notification: LocalNotificationSchedule): Promise<void> {
    if (!(await this.isPermitted())) return;

    if (isNativePlatform()) {
      const plugin = (await localPlugin.required()).plugin;
      try {
        await plugin.schedule({
          notifications: [
            {
              id: notification.id,
              title: notification.title,
              body: notification.body,
              ...(notification.at ? { schedule: { at: notification.at } } : {}),
              ...(isAndroid()
                ? { channelId: notification.channelId ?? DEFAULT_CHANNEL_ID }
                : {}),
              ...(notification.sound ? { sound: notification.sound } : {}),
              ...(notification.badge !== undefined
                ? { badge: notification.badge }
                : {}),
              ...(notification.data ? { extra: notification.data } : {}),
            },
          ],
        });
      } catch (error) {
        throw toNativeError(MODULE, error);
      }
      return;
    }

    if (!hasDom()) return;

    const show = () => {
      new Notification(notification.title, {
        body: notification.body,
        tag: String(notification.id),
      });
      webTimers.delete(notification.id);
    };

    const delay = notification.at
      ? notification.at.getTime() - Date.now()
      : 0;
    if (delay <= 0) {
      show();
      return;
    }
    webTimers.set(notification.id, setTimeout(show, delay));
  }

  /** Schedule several notifications at once. */
  async scheduleMany(
    notifications: LocalNotificationSchedule[],
  ): Promise<void> {
    for (const notification of notifications) {
      await this.schedule(notification);
    }
  }

  /** Cancel a scheduled notification that has not fired yet. */
  async cancel(id: number): Promise<void> {
    if (isNativePlatform()) {
      const plugin = (await localPlugin.required()).plugin;
      await plugin
        .cancel({ notifications: [{ id }] })
        .catch(() => {
          // Cancelling something already delivered is not an error.
        });
      return;
    }
    const timer = webTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      webTimers.delete(id);
    }
  }

  /** Cancel everything still pending. */
  async cancelAll(): Promise<void> {
    if (isNativePlatform()) {
      const plugin = (await localPlugin.required()).plugin;
      const { notifications } = await plugin.getPending();
      if (notifications.length > 0) {
        await plugin.cancel({ notifications }).catch(() => {
          // Best effort.
        });
      }
      return;
    }
    for (const timer of webTimers.values()) clearTimeout(timer);
    webTimers.clear();
  }

  /** Ids the OS still has scheduled. */
  async getPending(): Promise<number[]> {
    if (isNativePlatform()) {
      const plugin = (await localPlugin.required()).plugin;
      const { notifications } = await plugin.getPending();
      return notifications.map((entry) => entry.id);
    }
    return [...webTimers.keys()];
  }

  /**
   * The user tapped a notification this device displayed itself.
   *
   * Without this the tap only brings the application forward and the
   * notification's deep link is lost, which is indistinguishable from a broken
   * notification.
   */
  onAction(listener: NotificationActionListener): () => void {
    return this.actions.add(listener);
  }

  /** Attach the plugin listener once per application lifetime. */
  async ensureListeners(): Promise<void> {
    if (this.listenersReady || !isNativePlatform()) return;
    this.listenersReady = true;
    const plugin = (await localPlugin.optional())?.plugin ?? null;
    if (!plugin?.addListener) return;
    this.handles.push(
      await plugin.addListener("localNotificationActionPerformed", ((action: {
        notification: NativeLocalNotification;
      }) => {
        this.actions.emit(toPayload(action.notification));
      }) as (data: never) => void),
    );
  }

  async dispose(): Promise<void> {
    await removeHandles(this.handles);
    this.handles = [];
    this.listenersReady = false;
    this.actions.clear();
  }

  /** Register the Android notification channels. */
  async createChannels(): Promise<void> {
    if (!isAndroid()) return;
    const plugin = (await localPlugin.optional())?.plugin ?? null;
    if (!plugin?.createChannel) return;

    await Promise.all(
      DEFAULT_CHANNELS.map((channel) =>
        plugin
          .createChannel?.({
            id: channel.id,
            name: channel.name,
            description: channel.description,
            importance: channel.importance,
            visibility: 0,
            vibration: channel.vibration ?? true,
            ...(channel.sound ? { sound: channel.sound } : {}),
          })
          .catch(() => {
            // A channel that already exists is fine.
          }),
      ),
    );
  }

  /** Set the application badge count. */
  async setBadge(count: number): Promise<void> {
    if (typeof navigator === "undefined") return;
    const withBadge = navigator as Navigator & {
      setAppBadge?: (count: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    try {
      if (count <= 0) await withBadge.clearAppBadge?.();
      else await withBadge.setAppBadge?.(count);
    } catch {
      // Badging is advisory; failure must never break a flow.
    }
  }

  async clearBadge(): Promise<void> {
    await this.setBadge(0);
  }

  /** Dismiss notifications already showing in the tray. */
  async clearDelivered(): Promise<void> {
    if (!isNativePlatform()) return;
    const plugin = (await localPlugin.required()).plugin;
    await plugin.removeAllDeliveredNotifications().catch(() => {
      // Nothing to clear is a success.
    });
  }
}

export const localNotifications = new LocalNotificationsModule();
