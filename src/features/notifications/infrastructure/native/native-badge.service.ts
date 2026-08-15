"use client";

export class NativeBadgeService {
  async set(count: number): Promise<void> {
    if (typeof navigator !== "undefined" && "setAppBadge" in navigator) {
      await (navigator as Navigator & { setAppBadge: (count: number) => Promise<void> }).setAppBadge(count);
    }
  }

  async clear(): Promise<void> {
    if (typeof navigator !== "undefined" && "clearAppBadge" in navigator) {
      await (navigator as Navigator & { clearAppBadge: () => Promise<void> }).clearAppBadge();
    }
  }
}

export const nativeBadgeService = new NativeBadgeService();
