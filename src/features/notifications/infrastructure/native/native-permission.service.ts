"use client";

import { NativeCore, PermissionKinds } from "@asol/native-core";
import { nativePlatformService } from "./native-platform.service";

/**
 * Notification permission for the notifications feature.
 * Delegates to the NativeCore unified facade.
 */
export class NativePermissionService {
  async checkResult() {
    const res = await NativeCore.checkPermission(PermissionKinds.Notifications);
    if (res.ok) return res.value;
    return {
      kind: PermissionKinds.Notifications,
      state: "unsupported" as const,
      granted: false,
      canRequest: false,
    };
  }

  async requestResult() {
    const res = await NativeCore.requestPermission(PermissionKinds.Notifications);
    if (res.ok) return res.value;
    return {
      kind: PermissionKinds.Notifications,
      state: "unsupported" as const,
      granted: false,
      canRequest: false,
    };
  }

  canOpenSettings(): boolean {
    return nativePlatformService.isNative();
  }

  /**
   * True only when a settings screen actually opened.
   *
   * `res.ok` answers "did the call complete", not "did anything open" — a
   * shell that declines still completes, so returning it reported success for
   * a screen that never appeared and the caller skipped its recovery step.
   */
  async openSettings(): Promise<boolean> {
    const res = await NativeCore.openAppSettings();
    return res.ok && res.value;
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
    if (nativePlatformService.isNative()) return "default";
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }
    return Notification.permission;
  }
}

export const nativePermissionService = new NativePermissionService();
