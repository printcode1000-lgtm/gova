"use client";

import { GOVA_DB_STORES, govaDbGet, govaDbSet } from "@/lib/gova-db";
import { NotificationPlatforms } from "../domain/enums";
import { notificationApiService } from "../services/notification-api-service";

const DEVICE_ID_KEY = "web-push-device-id";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
  return output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength);
}

async function getDeviceId(): Promise<string> {
  const current = await govaDbGet<string>(GOVA_DB_STORES.APP_SETTINGS, DEVICE_ID_KEY);
  if (current) return current;
  const next =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `web:${crypto.randomUUID()}`
      : `web:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  await govaDbSet(GOVA_DB_STORES.APP_SETTINGS, DEVICE_ID_KEY, next);
  return next;
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
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    return Notification.permission;
  }

  async subscribe(uid: string) {
    if (!this.isSupported()) throw new Error("webPushUnsupported");
    const vapid = await notificationApiService.getWebPushPublicKey();
    if (!vapid.enabled || !vapid.publicKey) throw new Error("webPushNotConfigured");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") throw new Error("notificationPermissionDenied");

    const registration = await navigator.serviceWorker.register("/gova-push-sw.js");
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
      platform: NotificationPlatforms.Web,
      provider: "web_push",
      deviceId,
      token,
      deviceLabel: "Browser",
    });
    return { deviceId, subscription };
  }

  async unsubscribe(uid: string) {
    if (!this.isSupported()) return false;
    const registration = await navigator.serviceWorker.getRegistration("/gova-push-sw.js");
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();
    const deviceId = await getDeviceId();
    await notificationApiService.removeToken({ uid, deviceId });
    return true;
  }
}

export const webPushBrowserService = new WebPushBrowserService();
