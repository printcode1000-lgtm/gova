"use client";

import { getClientRuntimeContext } from "@/core/config/runtime-context.client";
import { NotificationPlatforms, type NotificationPlatform } from "@asol/notifications-core";

export class NativePlatformService {
  getPlatform(): NotificationPlatform {
    const platform = getClientRuntimeContext().platform;
    if (platform === "android") return NotificationPlatforms.Android;
    if (platform === "ios") return NotificationPlatforms.Ios;
    return NotificationPlatforms.Web;
  }

  isNative(): boolean {
    return getClientRuntimeContext().isNative;
  }
}

export const nativePlatformService = new NativePlatformService();
