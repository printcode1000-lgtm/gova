"use client";

import { PushNotifications } from "@capacitor/push-notifications";
import { capacitorPlatformService } from "./capacitor-platform.service";

export class CapacitorPermissionService {
  async request(): Promise<NotificationPermission | "unsupported"> {
    if (
      capacitorPlatformService.isNative() &&
      capacitorPlatformService.getPlatform() === "android"
    ) {
      let status = await PushNotifications.checkPermissions();
      if (
        status.receive === "prompt" ||
        status.receive === "prompt-with-rationale"
      ) {
        status = await PushNotifications.requestPermissions();
      }
      return status.receive === "granted"
        ? "granted"
        : status.receive === "denied"
          ? "denied"
          : "default";
    }
    if (typeof window === "undefined" || !("Notification" in window))
      return "unsupported";
    if (Notification.permission === "granted") return "granted";
    return Notification.requestPermission();
  }

  getCurrent(): NotificationPermission | "unsupported" {
    if (
      capacitorPlatformService.isNative() &&
      capacitorPlatformService.getPlatform() === "android"
    ) {
      return "default";
    }
    if (typeof window === "undefined" || !("Notification" in window))
      return "unsupported";
    return Notification.permission;
  }
}

export const capacitorPermissionService = new CapacitorPermissionService();
