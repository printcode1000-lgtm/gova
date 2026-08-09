"use client";

import { permissionManager, PermissionKinds } from "@/native-platform/permissions";
import { capacitorPlatformService } from "./capacitor-platform.service";

/**
 * Notification permission for the notifications feature.
 *
 * Delegates to the Native Platform Permission Manager; it must not import a
 * Capacitor plugin directly.
 */
export class CapacitorPermissionService {
  checkResult() {
    return permissionManager.check(PermissionKinds.Notifications);
  }

  requestResult() {
    return permissionManager.requestIfNeeded(PermissionKinds.Notifications);
  }

  openSettings() {
    return permissionManager.openSettings();
  }

  async request(): Promise<NotificationPermission | "unsupported"> {
    const result = await this.requestResult();
    if (result.state === "unsupported") return "unsupported";
    if (result.granted) return "granted";
    // A blocked permission is a denial the user can only undo in settings.
    return result.state === "denied" || result.state === "blocked"
      ? "denied"
      : "default";
  }

  getCurrent(): NotificationPermission | "unsupported" {
    // Native platforms answer asynchronously; the synchronous contract keeps
    // its historical "default" until `request()` resolves.
    if (capacitorPlatformService.isNative()) return "default";
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }
    return Notification.permission;
  }
}

export const capacitorPermissionService = new CapacitorPermissionService();
