"use client";

export class CapacitorPermissionService {
  async request(): Promise<NotificationPermission | "unsupported"> {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    if (Notification.permission === "granted") return "granted";
    return Notification.requestPermission();
  }

  getCurrent(): NotificationPermission | "unsupported" {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    return Notification.permission;
  }
}

export const capacitorPermissionService = new CapacitorPermissionService();
