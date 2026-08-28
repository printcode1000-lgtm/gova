"use client";

import { ASOL_DB_STORES, asolDbGet, asolDbSet } from "@asol/data-core/browser";

import {
  PROFILE_SECTIONS,
  type ProfileEditTab,
} from "@/features/profile/presentation/profile-page.types";

/**
 * Key-stable persistence for the profile editor's active tab.
 *
 * The page snapshot stores the same value, but its key embeds the full query
 * string, so returning through a slightly different URL (`?mode=edit` vs
 * `?mode=edit&returnTo=...`) loses it. This record is keyed by user only, so
 * the editor always reopens on the section the user left.
 */
const DB_KEY_PREFIX = "profile-edit-active-tab";

function dbKey(userId: string | undefined): string {
  return `${DB_KEY_PREFIX}:${userId || "anonymous"}`;
}

function isProfileEditTab(value: unknown): value is ProfileEditTab {
  return (
    typeof value === "string" &&
    PROFILE_SECTIONS.includes(value as ProfileEditTab)
  );
}

export async function readStoredProfileEditTab(
  userId: string | undefined,
): Promise<ProfileEditTab | null> {
  try {
    const stored = await asolDbGet<string>(
      ASOL_DB_STORES.APP_SETTINGS,
      dbKey(userId),
    );
    return isProfileEditTab(stored) ? stored : null;
  } catch {
    return null;
  }
}

export async function writeStoredProfileEditTab(
  userId: string | undefined,
  tab: ProfileEditTab,
): Promise<void> {
  try {
    await asolDbSet<string>(ASOL_DB_STORES.APP_SETTINGS, dbKey(userId), tab);
  } catch {
    /* storage unavailable — tab restoration is best effort */
  }
}
