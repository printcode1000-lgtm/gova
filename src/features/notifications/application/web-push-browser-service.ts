"use client";

import { ASOL_DB_STORES, asolDbGet, asolDbSet } from "@/lib/asol-db";
import { NotificationPlatforms } from "../domain/enums";
import { notificationApiService } from "../services/notification-api-service";

const DEVICE_ID_KEY = "web-push-device-id";

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
      window.isSecureContext
    );
  }

  getPermission(): NotificationPermission | "unsupported" {
    if (typeof window === "undefined" || !("Notification" in window))
      return "unsupported";
    return Notification.permission;
  }

  async subscribe(uid: string, phone: string) {
    if (!this.isSupported()) throw new Error("webPushUnsupported");
    const vapid = await notificationApiService.getWebPushPublicKey();
    if (!vapid.enabled || !vapid.publicKey)
      throw new Error("webPushNotConfigured");
    const permission = await Notification.requestPermission();
    if (permission !== "granted")
      throw new Error("notificationPermissionDenied");

    const registration = await waitForActiveServiceWorker(
      await navigator.serviceWorker.register("/asol-push-sw.js", {
        scope: "/",
      }),
    );
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid.publicKey),
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
      deviceLabel: "Browser",
    });
    return { deviceId, subscription };
  }

  async unsubscribe(uid: string, phone: string) {
    if (!this.isSupported()) return false;
    const registration = await navigator.serviceWorker.getRegistration("/");
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();
    const deviceId = await getDeviceId();
    await notificationApiService.removeToken({ uid, phone, deviceId });
    return true;
  }
}

export const webPushBrowserService = new WebPushBrowserService();
