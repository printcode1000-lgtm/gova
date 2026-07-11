"use client";

import type { DeviceToken } from "../../domain/entities";
import { capacitorPlatformService } from "./capacitor-platform.service";

export class CapacitorPushService {
  async register(uid: string): Promise<DeviceToken | null> {
    const platform = capacitorPlatformService.getPlatform();
    return {
      id: `${uid}:${platform}:pending`,
      uid,
      platform,
      provider: platform === "web" ? "web_push" : "capacitor",
      deviceId: `${platform}:default`,
      token: "pending-provider-token",
      deviceLabel: platform,
      enabled: false,
      lastSeenAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async unregister(): Promise<void> {
    return;
  }
}

export const capacitorPushService = new CapacitorPushService();
