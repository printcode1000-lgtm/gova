/**
 * Push notifications transport.
 *
 * Single responsibility: own the FCM/APNs registration lifecycle and surface
 * normalized payloads. It carries no business meaning — categories, routing,
 * dedupe, and persistence stay in the notifications feature that consumes it.
 *
 * Permission is never requested here implicitly; the caller must ask for it,
 * which keeps "do not prompt until required" enforceable.
 */

import { toNativeError } from "../core/errors";
import {
  createEmitter,
  removeHandles,
  type PluginHandle,
} from "../core/listener";
import { createLazyPlugin } from "../core/lazy-plugin";
import { getPlatformName, isAndroid, isNativePlatform } from "../core/platform";
import { permissionManager } from "../permissions/permission-manager";
import { PermissionKinds, type PermissionResult } from "../permissions/types";
import {
  DEFAULT_CHANNELS,
  type NotificationActionListener,
  type NotificationListener,
  type NotificationPayload,
  type PushToken,
  type PushTokenListener,
} from "./types";

const MODULE = "PushNotifications";
const REGISTRATION_TIMEOUT_MS = 20_000;

interface NativeNotification {
  id?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}

interface PushPluginApi {
  register: () => Promise<void>;
  unregister: () => Promise<void>;
  createChannel: (channel: Record<string, unknown>) => Promise<void>;
  getDeliveredNotifications: () => Promise<{
    notifications: NativeNotification[];
  }>;
  removeAllDeliveredNotifications: () => Promise<void>;
  addListener: (
    event: string,
    callback: (data: never) => void,
  ) => Promise<PluginHandle>;
}

const pushPlugin = createLazyPlugin(MODULE, async () => {
  const { PushNotifications } = await import("@capacitor/push-notifications");
  // Boxed: returning the proxy itself would make this promise call its
  // then() on the native bridge.
  return { plugin: PushNotifications as unknown as PushPluginApi };
});

function toPayload(
  native: NativeNotification,
  foreground: boolean,
): NotificationPayload {
  const rawData = native.data ?? {};
  return {
    id: native.id ?? `push_${Date.now()}`,
    title: native.title ?? "",
    body: native.body ?? "",
    data: Object.fromEntries(
      Object.entries(rawData).map(([key, value]) => [key, String(value ?? "")]),
    ),
    foreground,
  };
}

export class PushNotificationsModule {
  private handles: PluginHandle[] = [];
  private listenersReady = false;

  private readonly tokens = createEmitter<PushToken>("push:token");
  private readonly received = createEmitter<NotificationPayload>("push:received");
  private readonly actions = createEmitter<NotificationPayload>("push:action");

  private pendingResolve: ((token: string) => void) | null = null;
  private pendingReject: ((error: Error) => void) | null = null;

  /** True when this platform delivers push through a native transport. */
  isSupported(): boolean {
    const platform = getPlatformName();
    return isNativePlatform() && (platform === "android" || platform === "ios");
  }

  /** Current permission without prompting. */
  checkPermission(): Promise<PermissionResult> {
    return permissionManager.check(PermissionKinds.Notifications);
  }

  /** Explicitly prompt. Call only at the moment the user asks for it. */
  requestPermission(): Promise<PermissionResult> {
    return permissionManager.requestIfNeeded(PermissionKinds.Notifications);
  }

  /**
   * Register with the platform push service.
   * @throws `PermissionDenied` when notifications are not granted.
   * @throws `Timeout` when the service does not answer.
   */
  async register(): Promise<PushToken> {
    if (!this.isSupported()) {
      throw toNativeError(MODULE, new Error("Push is not supported here."));
    }

    const permission = await this.checkPermission();
    if (!permission.granted) {
      throw toNativeError(
        MODULE,
        new Error("Notification permission was not granted."),
      );
    }

    const plugin = (await pushPlugin.required()).plugin;
    await this.ensureListeners();
    if (isAndroid()) await this.createChannels();

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

  async unregister(): Promise<void> {
    if (!this.isSupported()) return;
    const plugin = (await pushPlugin.required()).plugin;
    await plugin.unregister().catch((error) => {
      console.warn("[NativePlatform:Push] unregister failed.", error);
    });
  }

  /** Notifications the OS has already shown and not yet dismissed. */
  async getDelivered(): Promise<NotificationPayload[]> {
    if (!this.isSupported()) return [];
    const plugin = (await pushPlugin.required()).plugin;
    const { notifications } = await plugin.getDeliveredNotifications();
    return notifications.map((notification) => toPayload(notification, false));
  }

  async removeAllDelivered(): Promise<void> {
    if (!this.isSupported()) return;
    const plugin = (await pushPlugin.required()).plugin;
    await plugin.removeAllDeliveredNotifications().catch(() => {
      // Nothing to remove is a success.
    });
  }

  /** Token issued or refreshed by the platform. */
  onToken(listener: PushTokenListener): () => void {
    return this.tokens.add(listener);
  }

  /** A notification arrived while the application was running. */
  onReceived(listener: NotificationListener): () => void {
    return this.received.add(listener);
  }

  /** The user tapped a notification. */
  onAction(listener: NotificationActionListener): () => void {
    return this.actions.add(listener);
  }

  /** Attach the plugin listeners once per application lifetime. */
  async ensureListeners(): Promise<void> {
    if (this.listenersReady || !this.isSupported()) return;
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

      await plugin.addListener("registrationError", ((error: {
        error: string;
      }) => {
        this.pendingReject?.(new Error(error.error));
      }) as (data: never) => void),

      await plugin.addListener("pushNotificationReceived", ((
        native: NativeNotification,
      ) => {
        this.received.emit(toPayload(native, true));
      }) as (data: never) => void),

      await plugin.addListener("pushNotificationActionPerformed", ((action: {
        notification: NativeNotification;
      }) => {
        this.actions.emit(toPayload(action.notification, false));
      }) as (data: never) => void),
    );
  }

  /** Create the Android channels this application uses. */
  async createChannels(): Promise<void> {
    if (!isAndroid()) return;
    const plugin = (await pushPlugin.required()).plugin;
    await Promise.all(
      DEFAULT_CHANNELS.map((channel) =>
        plugin
          .createChannel({
            id: channel.id,
            name: channel.name,
            description: channel.description,
            importance: channel.importance,
            visibility: 0,
            vibration: channel.vibration ?? true,
            ...(channel.sound ? { sound: channel.sound } : {}),
          })
          .catch((error) => {
            console.warn(
              `[NativePlatform:Push] channel ${channel.id} failed.`,
              error,
            );
          }),
      ),
    );
  }

  async dispose(): Promise<void> {
    await removeHandles(this.handles);
    this.handles = [];
    this.listenersReady = false;
    this.tokens.clear();
    this.received.clear();
    this.actions.clear();
  }
}

export const pushNotifications = new PushNotificationsModule();
