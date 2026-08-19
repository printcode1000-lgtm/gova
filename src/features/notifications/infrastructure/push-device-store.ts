"use client";

import { ASOL_DB_STORES, asolDbGet, asolDbSet } from "@asol/data-core/browser";

/**
 * Where this device's push registration state is kept.
 *
 * Two facts, both local to the device and neither of them a notification: the
 * stable id this install reports to the server, and whether the user has opted
 * in here. They were inlined in the Capacitor push adapter, which already had
 * enough to do — listeners, payload mapping, registration — and which had to be
 * edited whenever a storage key changed.
 *
 * The legacy Android keys are read on the way in and never written: a device
 * that opted in before the keys were made platform-specific keeps its id and
 * its opt-in, so an upgrade does not silently unsubscribe it.
 */

type PushPlatform = "android" | "ios";

const LEGACY_ANDROID_DEVICE_ID_KEY = "android-push-device-id";
const LEGACY_ANDROID_ENABLED_KEY = "android-push-enabled";

const deviceIdKey = (platform: PushPlatform) => `${platform}-push-device-id`;
const enabledKey = (platform: PushPlatform) => `${platform}-push-enabled`;

function randomDeviceId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

export class PushDeviceStore {
  /** The device id, creating and storing one the first time it is asked for. */
  async deviceId(platform: PushPlatform): Promise<string> {
    const existing = await asolDbGet<string>(
      ASOL_DB_STORES.APP_SETTINGS,
      deviceIdKey(platform),
    );
    if (existing) return existing;

    if (platform === "android") {
      const legacy = await asolDbGet<string>(
        ASOL_DB_STORES.APP_SETTINGS,
        LEGACY_ANDROID_DEVICE_ID_KEY,
      );
      if (legacy) {
        await asolDbSet(ASOL_DB_STORES.APP_SETTINGS, deviceIdKey(platform), legacy);
        return legacy;
      }
    }

    const generated = `${platform}:${randomDeviceId()}`;
    await asolDbSet(ASOL_DB_STORES.APP_SETTINGS, deviceIdKey(platform), generated);
    return generated;
  }

  async isEnabled(platform: PushPlatform): Promise<boolean> {
    const current = await asolDbGet<boolean>(
      ASOL_DB_STORES.APP_SETTINGS,
      enabledKey(platform),
    );
    if (current === true) return true;
    return (
      platform === "android" &&
      (await asolDbGet<boolean>(
        ASOL_DB_STORES.APP_SETTINGS,
        LEGACY_ANDROID_ENABLED_KEY,
      )) === true
    );
  }

  async setEnabled(platform: PushPlatform, enabled: boolean): Promise<void> {
    await asolDbSet(ASOL_DB_STORES.APP_SETTINGS, enabledKey(platform), enabled);
    // The legacy flag is cleared alongside so an opt-out is not undone by a
    // stale `true` left over from an older install.
    if (platform === "android" && !enabled) {
      await asolDbSet(ASOL_DB_STORES.APP_SETTINGS, LEGACY_ANDROID_ENABLED_KEY, false);
    }
  }
}

export const pushDeviceStore = new PushDeviceStore();
