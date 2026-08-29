"use client";

import { ASOL_DB_STORES, asolDbGet, asolDbSet } from "@asol/data-core/browser";
import { NotificationPlatforms } from "@asol/notifications-core";
import { WEB_PUSH_VAPID_PUBLIC_KEY } from "@asol/notifications-core";
import { withBasePath } from "@/core/config/public-env";
import { notificationApiService } from "../http/notification-api-service";
import { readNotificationLocale } from "../preferences/read-notification-locale";
import { nativePermissionService } from "../native/native-permission.service";

const DEVICE_ID_KEY = "web-push-device-id";

function serviceWorkerScope(): string {
  return withBasePath("/");
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = Uint8Array.from(
    [...rawData].map((char) => char.charCodeAt(0)),
  );
  return output.buffer.slice(
    output.byteOffset,
    output.byteOffset + output.byteLength,
  );
}

async function getDeviceId(): Promise<string> {
  const current = await asolDbGet<string>(
    ASOL_DB_STORES.APP_SETTINGS,
    DEVICE_ID_KEY,
  );
  if (current) return current;
  const next =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `web:${crypto.randomUUID()}`
      : `web:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  await asolDbSet(ASOL_DB_STORES.APP_SETTINGS, DEVICE_ID_KEY, next);
  return next;
}

function isIOSDevice(): boolean {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ reports as "Macintosh" but, unlike a real Mac, exposes touch points.
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

/**
 * iOS restricts Web Push to a site added to the Home Screen: `serviceWorker`,
 * `PushManager`, and `Notification` all exist in a plain Safari tab, but
 * `Notification.requestPermission()` is silently denied there regardless of
 * the user's choice. Only a standalone (installed) launch can actually
 * subscribe, so a plain tab must be treated as unsupported rather than
 * showing an opt-in that can never succeed.
 */
function isIOSSafariNotInstalled(): boolean {
  if (!isIOSDevice()) return false;
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true;
  return !standalone;
}

async function waitForActiveServiceWorker(
  registration: ServiceWorkerRegistration,
): Promise<ServiceWorkerRegistration> {
  if (registration.active) return registration;

  const readyRegistration = await navigator.serviceWorker.ready;
  if (readyRegistration.active) return readyRegistration;

  const installingWorker = registration.installing ?? registration.waiting;
  if (!installingWorker) return readyRegistration;

  await new Promise<void>((resolve) => {
    const handleStateChange = () => {
      if (installingWorker.state !== "activated") return;
      installingWorker.removeEventListener("statechange", handleStateChange);
      resolve();
    };

    installingWorker.addEventListener("statechange", handleStateChange);
    handleStateChange();
  });

  return navigator.serviceWorker.ready;
}

export class WebPushBrowserService {
  isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window &&
      window.isSecureContext &&
      !isIOSSafariNotInstalled()
    );
  }

  /**
   * Current permission, without prompting.
   * Delegates to the Permission Manager; the historical return shape is kept
   * so existing callers do not change.
   */
  async getPermission(): Promise<NotificationPermission | "unsupported"> {
    const result = await nativePermissionService.checkResult();
    if (result.state === "unsupported") return "unsupported";
    if (result.granted) return "granted";
    return result.state === "denied" || result.state === "blocked"
      ? "denied"
      : "default";
  }

  /**
   * Whether this browser already holds a push subscription.
   *
   * The web counterpart of the native "device enabled" flag, so the post-login
   * opt-in dialog can skip a browser that already opted in. Never prompts.
   */
  async hasSubscription(): Promise<boolean> {
    if (!this.isSupported()) return false;
    const registration = await navigator.serviceWorker.getRegistration(
      serviceWorkerScope(),
    );
    return Boolean(await registration?.pushManager.getSubscription());
  }

  async subscribe(uid: string, phone: string) {
    if (!this.isSupported()) throw new Error("webPushUnsupported");
    // Every caller already resolves permission (checkResult/requestResult)
    // before invoking enable(), same as the native register() path. Re-requesting
    // here re-prompts WebKit after several intervening awaits, past the user
    // gesture it needs, which spuriously denies a permission already granted.
    const permission = await nativePermissionService.checkResult();
    if (!permission.granted) throw new Error("notificationPermissionDenied");

    const registration = await waitForActiveServiceWorker(
      await navigator.serviceWorker.register(withBasePath("/asol-push-sw.js"), {
        scope: serviceWorkerScope(),
      }),
    );
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(WEB_PUSH_VAPID_PUBLIC_KEY),
      }));
    const deviceId = await getDeviceId();
    const token = JSON.stringify(subscription.toJSON());
    await notificationApiService.registerToken({
      uid,
      phone,
      platform: NotificationPlatforms.Web,
      provider: "web_push",
      deviceId,
      token,
      locale: await readNotificationLocale(),
      deviceLabel: "Browser",
    });
    return { deviceId, subscription };
  }

  /**
   * Re-send the existing subscription with the current UI language.
   *
   * Never prompts: when there is no active subscription there is nothing to
   * update, so the user is not asked for a permission they did not request.
   */
  async refreshLocale(uid: string, phone: string): Promise<boolean> {
    if (!this.isSupported()) return false;
    const registration = await navigator.serviceWorker.getRegistration(
      serviceWorkerScope(),
    );
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return false;
    await notificationApiService.registerToken(
      {
        uid,
        phone,
        platform: NotificationPlatforms.Web,
        provider: "web_push",
        deviceId: await getDeviceId(),
        token: JSON.stringify(subscription.toJSON()),
        locale: await readNotificationLocale(),
        deviceLabel: "Browser",
      },
      // Nobody asked for this refresh, and the next one re-sends the same
      // subscription, so an unreachable server is a warning, not an error.
      { silent: true },
    );
    return true;
  }

  async unsubscribe(uid: string, phone: string) {
    if (!this.isSupported()) return false;
    const registration = await navigator.serviceWorker.getRegistration(
      serviceWorkerScope(),
    );
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();
    const deviceId = await getDeviceId();
    await notificationApiService.removeToken({ uid, phone, deviceId });
    return true;
  }
}

export const webPushBrowserService = new WebPushBrowserService();
