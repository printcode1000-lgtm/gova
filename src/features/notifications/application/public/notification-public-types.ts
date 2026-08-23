import type { NotificationEntity, NotificationRoute } from "@asol/notifications-core";
import type { NotificationPlatform } from "@asol/notifications-core";

/**
 * Types the public API is allowed to hand out.
 *
 * Everything here is owned by this module or by its domain. No Capacitor,
 * Firebase, APNs, Web Push, IndexedDB, repository, or Native Core type
 * appears in a public signature — a consumer must never have to import an
 * adapter's vocabulary to call a use case.
 */

/** Mirrors the platform permission states, restated so consumers never import them. */
export type NotificationPermissionStateName =
  | "granted"
  | "denied"
  | "prompt"
  | "blocked"
  | "unsupported";

export interface NotificationPermissionState {
  granted: boolean;
  state: NotificationPermissionStateName;
  /** True when only the OS settings screen can change the answer. */
  canOpenSettings: boolean;
}

export interface ReceiveHandlers {
  /** A notification arrived while the application was running. */
  onReceived?: (notification: NotificationEntity) => Promise<void> | void;
  /** The user tapped a notification; it is already marked read. */
  onOpened?: (notification: NotificationEntity) => Promise<void> | void;
}

export interface NotificationCenterSnapshot {
  notifications: NotificationEntity[];
  unreadCount: number;
}

/**
 * What happened to an inbound notification.
 *
 * `stored` is the acknowledgement signal. A caller that must tell a source the
 * notification was handled may only do so when it is true: a crash between
 * persistence and acknowledgement then leaves the item to be re-imported rather
 * than silently lost.
 */
export interface NotificationReceiveOutcome {
  notification: NotificationEntity;
  stored: boolean;
  reason?: "duplicate" | "dismissed" | "placeholder" | "invalid";
}

export interface OpenNotificationResult {
  /** The deep link to follow, if the notification carries one. */
  route?: NotificationRoute;
}

export interface NotificationDiagnostics {
  platform: NotificationPlatform;
  /** Whether this platform can deliver push at all. */
  pushSupported: boolean;
  /** Whether push runs through FCM/APNs rather than Web Push. */
  nativePush: boolean;
  /** Whether this device has already opted in. */
  deviceEnabled: boolean;
  permission: NotificationPermissionState;
  deviceTokenCount: number;
  storedCount: number;
  unreadCount: number;
  pendingRetryCount: number;
  /**
   * Records waiting in the Android device-local inbox.
   *
   * A count only, never content. A non-zero value on a running session means
   * notifications arrived while the WebView could not run and have not been
   * confirmed into IndexedDB yet — which is the one thing a bug report about a
   * missing notification actually needs to know.
   */
  pendingNativeInboxCount: number;
}
