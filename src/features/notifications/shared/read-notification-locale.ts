"use client";

import { readAppPreferencesFromDb } from "@/shared/preferences/app-preferences-storage";
import type { NotificationLocale } from "@asol/notifications-core";

/**
 * The language this device reads in, for code that runs outside React.
 *
 * Registered with every push token so the server can build notification text
 * in the recipient's own language instead of one hard-coded default.
 */
export async function readNotificationLocale(): Promise<NotificationLocale> {
  try {
    const preferences = await readAppPreferencesFromDb();
    return preferences.locale === "en" ? "en" : "ar";
  } catch {
    return "ar";
  }
}
