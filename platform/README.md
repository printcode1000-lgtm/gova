# GOVA Platform Layer (Capacitor)

Capacitor is a **native runtime shell** only. Full reference: **[doc/system/capacitor.md](../doc/system/capacitor.md)**.

## Layout

| Path | Purpose |
|---|---|
| `capacitor.config.ts` | Web dir, app id, optional live-reload server URL |
| `android/` | Generated Android Studio project |
| `ios/` | Generated Xcode project |
| `out/` | Static web assets (`npm run build:static`) |

## Production

```bash
npm run cap:build
npx cap open android   # or ios
```

`cap:build` always bakes the Vercel backend URL (`https://gova-swart.vercel.app` from `platform/capacitor.defaults.ts`) into the static export, then runs `cap sync`.

To use a different backend URL: set `GOVA_CAPACITOR_API_BASE_URL` before `npm run cap:build`.

## Live reload (optional)

1. Start the Next.js dev server: `npm run dev`
2. Point Capacitor at your machine (use LAN IP, not localhost):

```bash
set CAPACITOR_SERVER_URL=http://192.168.1.10:3000
npx cap sync
npx cap open android
```

Unset `CAPACITOR_SERVER_URL` and run `npx cap sync` again to return to bundled `out/` assets.

## Data access

Mobile builds use **GovaApiClient → HTTPS → Business APIs** only. Set `NEXT_PUBLIC_GOVA_API_BASE_URL` at build time. No SQLite, Drizzle, or Turso in the native shell.
