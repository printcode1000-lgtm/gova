"use client";

import {
  ASOL_DB_STORES,
  asolDbDeleteAuthLegacy,
  asolDbDeleteCurrentSession,
  asolDbGet,
  asolDbGetAll,
  asolDbSet,
} from "@/lib/asol-db";
import { publicEnv } from "@/core/config";
import {
  DEFAULT_APP_PREFERENCES,
  writeAppPreferencesToDb,
} from "@/lib/preferences";
import {
  DEFAULT_THEME_PREFERENCES,
  writeThemePreferencesToDb,
} from "@/theme/runtime";

import {
  createInstallationState,
  decideInstallationInitialization,
  type InstallationState,
} from "./installation-policy";

export const INSTALLATION_STATE_KEY = "installation-state";

function currentBundleVersion(): string {
  return publicEnv.webBundleVersion || publicEnv.nativeVersion;
}

function isInstallationState(value: unknown): value is InstallationState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<InstallationState>;
  return (
    typeof state.schemaVersion === "number" &&
    (state.origin === "fresh" || state.origin === "legacy") &&
    typeof state.firstSeenBundleVersion === "string" &&
    typeof state.lastSeenBundleVersion === "string" &&
    typeof state.initializedAt === "string" &&
    typeof state.lastUpdatedAt === "string"
  );
}

async function hasExistingClientData(): Promise<boolean> {
  for (const store of Object.values(ASOL_DB_STORES)) {
    const rows = await asolDbGetAll(store);
    if (rows.length > 0) return true;
  }
  return false;
}

/**
 * Establishes defaults only for a genuinely empty installation.
 *
 * Existing installations without a marker are adopted without mutation. This
 * protects sessions, settings, carts, favorites, notifications and page state
 * when the marker is first introduced. Later native or OTA versions only
 * update marker metadata and never reset client data.
 */
export async function initializeClientInstallation(): Promise<void> {
  const rawState = await asolDbGet<unknown>(
    ASOL_DB_STORES.APP_SETTINGS,
    INSTALLATION_STATE_KEY,
  );
  const storedState = isInstallationState(rawState) ? rawState : null;
  const decision = decideInstallationInitialization({
    storedState,
    hasExistingClientData: storedState ? true : await hasExistingClientData(),
  });

  if (decision === "fresh") {
    await asolDbDeleteCurrentSession();
    await asolDbDeleteAuthLegacy();
    await writeThemePreferencesToDb({ ...DEFAULT_THEME_PREFERENCES });
    await writeAppPreferencesToDb({ ...DEFAULT_APP_PREFERENCES });
  }

  const now = new Date().toISOString();
  await asolDbSet(
    ASOL_DB_STORES.APP_SETTINGS,
    INSTALLATION_STATE_KEY,
    createInstallationState({
      decision,
      bundleVersion: currentBundleVersion(),
      now,
      previous: storedState,
    }),
  );
}
