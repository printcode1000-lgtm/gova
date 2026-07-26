"use client";

import { Capacitor } from "@capacitor/core";
import { NotificationPlatforms, type NotificationPlatform } from "../../domain/enums";

export class CapacitorPlatformService {
  getPlatform(): NotificationPlatform {
    const platform = Capacitor.getPlatform();
    if (platform === "android") return NotificationPlatforms.Android;
    if (platform === "ios") return NotificationPlatforms.Ios;
    return NotificationPlatforms.Web;
  }

  isNative(): boolean {
    return Capacitor.isNativePlatform();
  }
}

export const capacitorPlatformService = new CapacitorPlatformService();
