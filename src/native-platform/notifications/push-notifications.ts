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

import { registerPlugin } from "@capacitor/core";
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
import { isNotificationWebViewForeground } from "./delivery-visibility";
import {
  type NotificationActionListener,
  type NotificationInboxRecord,
  type NotificationInboxTap,
  type NotificationListener,
  type NotificationPayload,
  type NotificationTapListener,
  type PushToken,
  type PushTokenListener,
} from "./types";

const MODULE = "PushNotifications";
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
  /** Records the native service persisted before displaying, for one uid. */
  listPending: (options: { uid: string }) => Promise<{ records: NativeInboxRecord[] }>;
  /** Delete records the web layer has committed to IndexedDB. */
  acknowledge: (options: {
    uid: string;
    recordIds: string[];
  }) => Promise<{ acknowledged: number }>;
  /** Erase every pending record. Account deletion / clear-all-local-data only. */
  clearPending: () => Promise<void>;
  getPendingCount: () => Promise<{ count: number }>;
  getPendingTap: () => Promise<{
    recordId?: string;
    uid?: string;
    notificationId?: string;
    record?: NativeInboxRecord;
  }>;
  clearPendingTap: () => Promise<void>;
  addListener: (
    event: string,
    callback: (data: never) => void,
  ) => Promise<PluginHandle>;
}

// This is an application-owned plugin that is compiled into MainActivity, not
// an optional npm dependency. Register its proxy synchronously so startup
// cannot permanently lose the Android native inbox to a dynamic-import race.
const notificationInboxPlugin =
  registerPlugin<NotificationInboxPluginApi>("AsolNotificationInbox");

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
    // Never foreground: a record exists precisely because the WebView was not
    // running when the message arrived.
    payload: toPayload(native.payload ?? {}, false),
  };
}

export class PushNotificationsModule {
  private handles: PluginHandle[] = [];
  private listenersReady = false;
  private tapListenerReady = false;

  private readonly tokens = createEmitter<PushToken>("push:token");
  private readonly received = createEmitter<NotificationPayload>("push:received");
  private readonly actions = createEmitter<NotificationPayload>("push:action");
  private readonly taps = createEmitter<NotificationInboxTap>("push:tap");

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

    // Channel creation does not depend on the grant, so it happens before the
    // check: a denied device keeps its channels and registers nothing.
    if (isAndroid()) await this.createChannels();

    const permission = await this.checkPermission();
    if (!permission.granted) {
      throw toNativeError(
        MODULE,
        new Error("Notification permission was not granted."),
      );
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
    // Capacitor plugins are Proxies. The `in` operator is not a reliable
    // capability check on that proxy and can report a registered native method
    // as absent. Select the platform API explicitly instead.
    const { notifications } = isAndroid()
      ? await notificationInboxPlugin.getDelivered()
      : await (await pushPlugin.required()).plugin.getDeliveredNotifications();
    return notifications.map((notification) => toPayload(notification, false));
  }

  // ---- the device-local inbox ----------------------------------------------

  /**
   * Notifications the native service persisted while JavaScript could not run.
   *
   * This is the durable path, and the only one that is reliable: the record was
   * written to application-private storage (encrypted when AndroidKeyStore is
   * available) *before* the system
   * notification was posted, so it survives the tray being cleared, the
   * notification being tapped away, and the process being killed.
   *
   * Android only. Everything else returns nothing rather than throwing, because
   * iOS and the browser have their own delivery guarantees and no such gap.
   */
  async listPendingInbox(uid: string): Promise<NotificationInboxRecord[]> {
    if (!isAndroid() || !uid) return [];
    const { records } = await notificationInboxPlugin.listPending({ uid });
    return records
      .map((record) => toInboxRecord(record))
      .filter((record): record is NotificationInboxRecord => record !== null);
  }

  /**
   * Delete records the caller has durably stored.
   *
   * Call this only *after* the notification is in IndexedDB. The whole point of
   * the split is that a crash between the two leaves the record to be imported
   * again — a duplicate import is free, a lost notification is not.
   *
   * @returns how many records the native side actually removed.
   */
  async acknowledgeInbox(uid: string, recordIds: readonly string[]): Promise<number> {
    if (!isAndroid() || !uid || recordIds.length === 0) return 0;
    const { acknowledged } = await notificationInboxPlugin.acknowledge({
      uid,
      recordIds: [...recordIds],
    });
    return typeof acknowledged === "number" ? acknowledged : 0;
  }

  /** Erase the device-local inbox. Account deletion and local-data wipe only. */
  async clearInbox(): Promise<void> {
    if (!isAndroid()) return;
    await notificationInboxPlugin.clearPending();
  }

  /** Pending record count, for diagnostics. Carries no notification content. */
  async pendingInboxCount(): Promise<number> {
    if (!isAndroid()) return 0;
    const { count } = await notificationInboxPlugin.getPendingCount();
    return typeof count === "number" ? count : 0;
  }

  /**
   * The tap this process was launched or resumed with, if any.
   *
   * Read, never consumed: `clearInboxTap` is separate so the caller can verify
   * the owning user and finish storing the notification before the pointer is
   * given up. A tap for a user who is not signed in yet stays pending.
   */
  async getInboxTap(): Promise<NotificationInboxTap | null> {
    if (!isAndroid()) return null;
    const tap = await notificationInboxPlugin.getPendingTap();
    const recordId = typeof tap.recordId === "string" ? tap.recordId.trim() : "";
    if (!recordId) return null;
    const record = tap.record ? toInboxRecord(tap.record) : null;
    const notificationId =
      typeof tap.notificationId === "string" && tap.notificationId.trim()
        ? tap.notificationId.trim()
        : (record?.notificationId ?? "");
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

  /** A notification tapped while this process was already running. */
  onInboxTap(listener: NotificationTapListener): () => void {
    return this.taps.add(listener);
  }

  /**
   * Attach the tap listener.
   *
   * Separate from `ensureListeners`, and independent of it: the push plugin's
   * own listeners need the plugin to have loaded, while this one belongs to the
   * application's own bridge and must be reachable even when push registration
   * never happened.
   */
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
          notificationId:
            typeof tap.notificationId === "string" ? tap.notificationId.trim() : "",
        });
      }) as (data: never) => void),
    );
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
        this.received.emit(
          toPayload(native, isNotificationWebViewForeground()),
        );
      }) as (data: never) => void),

      await plugin.addListener("pushNotificationActionPerformed", ((action: {
        notification: NativeNotification;
      }) => {
        this.actions.emit(toPayload(action.notification, false));
      }) as (data: never) => void),
    );
  }

  /**
   * Create the Android channels this application uses.
   *
   * Independent of the notification permission: a channel is a declaration, not
   * a notification, and the same native bridge runs it at activity startup.
   *
   * The single creator on Android. The native side sets the sound from a stable
   * `android.resource://<package>/raw/custom_notification` URI, which a
   * string-based channel API cannot express, and rejects when the channel set
   * could not be ensured — so this rejects too rather than reporting success.
   */
  async createChannels(): Promise<void> {
    if (!isAndroid()) return;
    await notificationInboxPlugin.ensureChannels();
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

export const pushNotifications = new PushNotificationsModule();
