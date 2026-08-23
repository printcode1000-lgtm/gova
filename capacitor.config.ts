import type { CapacitorConfig } from "@capacitor/cli";
import {
  BRANDING_ANDROID_NOTIFICATION_COLOR,
  BRANDING_ANDROID_NOTIFICATION_SMALL_ICON,
} from "@asol/branding-core";

import { CAPACITOR_INCLUDE_PLUGINS } from "@asol/native-core";

/**
 * Capacitor platform configuration — runtime shell only.
 *
 * Production: webDir = `out/` from `npm run build:static` (no server.url).
 *
 * Live reload (development): set CAPACITOR_SERVER_URL before sync/run, e.g.
 *   CAPACITOR_SERVER_URL=http://192.168.1.10:3000 npx cap sync
 * Requires `npm run dev` on that host. No application code changes.
 */
const liveReloadUrl = process.env.CAPACITOR_SERVER_URL?.replace(/\/$/, "");

/**
 * The plugin allowlist, read from the package that owns the plugins.
 *
 * Capacitor discovers plugins by reading the **root** `package.json` dependencies. Every
 * Capacitor plugin here is declared by `@asol/native-core` instead — rule 9 of
 * `docs/01-architecture/02-packages/module-isolation-rules.md`: upgrading Capacitor must touch one
 * module. So `npx cap sync` found zero plugins and regenerated
 * `android/capacitor.settings.gradle` with none of them, dropping 25 registrations and
 * failing the native compile with "package com.capacitorjs.plugins.pushnotifications does
 * not exist".
 *
 * `includePlugins` is Capacitor's own answer: an explicit allowlist that overrides
 * discovery. Deriving it from native-core's dependencies keeps one source of truth, so
 * adding a plugin there is enough and this file needs no edit.
 */
const includePlugins = [...CAPACITOR_INCLUDE_PLUGINS];

const config: CapacitorConfig = {
  appId: "hgh.asol.app",
  appName: "ASOL",
  webDir: "out",
  includePlugins,
  android: {
    allowMixedContent: true,
  },
  plugins: {
    StatusBar: {
      // Edge-to-edge is forced on Android 15+ and is the default elsewhere, so
      // it is declared explicitly: the web layer reserves the inset itself via
      // `SafeAreaController` + the `--asol-safe-area-*` variables.
      overlaysWebView: true,
      // Boot style only. `asol-app-init.js` paints the light theme before first
      // paint, so dark glyphs match it; `SafeAreaController` takes over as soon
      // as the resolved colour scheme is known.
      style: "LIGHT",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "banner", "list"],
    },
    LocalNotifications: {
      smallIcon: BRANDING_ANDROID_NOTIFICATION_SMALL_ICON,
      iconColor: BRANDING_ANDROID_NOTIFICATION_COLOR,
    },
  },
  server: liveReloadUrl
    ? {
        url: liveReloadUrl,
        cleartext: liveReloadUrl.startsWith("http://"),
      }
    : undefined,
};

export default config;
