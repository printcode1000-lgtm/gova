"use client";

import { ASOL_DB_STORES, asolDbGet, asolDbSet } from "@asol/data-core/browser";

/**
 * Key-stable persistence for the notifications page's selected filter tab.
 *
 * The page snapshot key embeds the full query string, so reaching
 * `/notifications` without `?filter=` resolves to a different snapshot and
 * loses the tab. This record is keyed by user only, so the page always reopens
 * on the tab the user left. Values are stored raw; the caller normalizes them.
 */
const DB_KEY_PREFIX = "notifications-active-filter";

function dbKey(userId: string | undefined): string {
  return `${DB_KEY_PREFIX}:${userId || "anonymous"}`;
}

export async function readStoredNotificationsFilter(
  userId: string | undefined,
): Promise<string | null> {
  try {
    const stored = await asolDbGet<string>(
      ASOL_DB_STORES.APP_SETTINGS,
      dbKey(userId),
    );
    return typeof stored === "string" ? stored : null;
  } catch {
    return null;
  }
}

export async function writeStoredNotificationsFilter(
  userId: string | undefined,
  filter: string,
): Promise<void> {
  try {
    await asolDbSet<string>(ASOL_DB_STORES.APP_SETTINGS, dbKey(userId), filter);
  } catch {
    /* storage unavailable — tab restoration is best effort */
  }
}
