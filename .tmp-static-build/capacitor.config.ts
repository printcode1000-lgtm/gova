import type { CapacitorConfig } from "@capacitor/cli";

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

const config: CapacitorConfig = {
  appId: "hgh.asol.app",
  appName: "ASOL",
  webDir: "out",
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
  },
  server: liveReloadUrl
    ? {
        url: liveReloadUrl,
        cleartext: liveReloadUrl.startsWith("http://"),
      }
    : undefined,
};

export default config;
