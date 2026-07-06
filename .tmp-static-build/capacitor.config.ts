import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor platform configuration — runtime shell only.
 *
 * Production: webDir = `out/` from `npm run build:static` (no server.url).
 *
 * Live reload (development): set CAPACITOR_SERVER_URL before sync/run, e.g.
 *   CAPACITOR_SERVER_URL=http://192.168.1.10:3000 npx cap sync
 * Requires `npm run dev` on that host. No application code changes.
 */
const liveReloadUrl = process.env.CAPACITOR_SERVER_URL?.replace(/\/$/, '');

const config: CapacitorConfig = {
  appId: 'com.gova.app',
  appName: 'GOVA',
  webDir: 'out',
  android: {
    allowMixedContent: true,
  },
  server: liveReloadUrl
    ? {
        url: liveReloadUrl,
        cleartext: liveReloadUrl.startsWith('http://'),
      }
    : undefined,
};

export default config;
