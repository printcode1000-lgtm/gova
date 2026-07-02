# Capacitor Platform

GOVA uses **Capacitor as a native runtime shell only** — Android and iOS load the same static web app produced by Next.js. Capacitor does **not** contain business logic, database drivers, ORM code, or SQLite/Turso clients.

For the full data-flow architecture (GovaApiClient, Business APIs, Repository), see [data-layers/README.md](./data-layers/README.md).

---

## Role in the project

```
Next.js (single codebase)
        ↓
npm run build:static
        ↓
out/                    ← webDir (always)
        ↓
Capacitor sync
        ↓
android/  ·  ios/       ← native shells
```

| Layer | Responsibility |
|---|---|
| `src/` (UI, Hooks, Services, API client) | Same code as web — platform-agnostic |
| `out/` | Static export consumed by Capacitor |
| `platform/` | Capacitor defaults and platform-only config |
| `capacitor.config.ts` | App id, webDir, live-reload server URL |
| `android/` · `ios/` | Generated native projects (commit to repo) |

**Not in Capacitor:** Repository, Drizzle, SQLite, Turso, SQL, database plugins.

---

## File map

```
capacitor.config.ts              # Root Capacitor config (webDir: out)
platform/
├── capacitor.defaults.ts        # Default Vercel API URL for cap:build
└── README.md                    # Short platform-layer pointer
scripts/
└── cap-build.ts                 # cap:build implementation
android/                         # Android Studio project
ios/                             # Xcode project
out/                             # Static assets (from build:static)
```

### Dependencies (package.json)

| Package | Purpose |
|---|---|
| `@capacitor/core` | Runtime bridge |
| `@capacitor/cli` | CLI (`cap sync`, `cap open`, …) |
| `@capacitor/android` | Android platform |
| `@capacitor/ios` | iOS platform |
| `@capacitor/app` | Android system Back events and confirmed application exit |
| `@capacitor/filesystem` | Private storage for verified file-level OTA releases |
| `@capacitor/camera` | Native one-image gallery selection and camera capture for `StorageImageManager` |
| `@capgo/capacitor-speech-recognition` | Native Arabic/English speech-to-text for automatic voice-enabled fields |

No database plugin is installed. `@capacitor/filesystem` is used by the OTA platform adapter to store verified file-level web releases in application-private storage and by the image source picker to read the selected native image into a browser `File`; it is not a data-layer database. `@capacitor/app` is used by the Android platform adapter for system Back events and the confirmed exit action. The camera plugin is isolated behind the image source picker adapter, and the speech-recognition plugin is isolated behind the platform speech adapter. See [ota-update-system.md](./ota-update-system.md), [mobile-back-button-system.md](../system/mobile-back-button-system.md), [storage-image-source-picker-system.md](../system/storage-image-source-picker-system.md), and [voice-input-system.md](../system/voice-input-system.md).

---

## npm scripts

| Command | What it does |
|---|---|
| `npm run cap:build` | Automatic version + R2 delta publish + full verification + native version pinning + `cap sync` |
| `npm run cap:sync` | Copy `out/` into native projects and update native config |
| `npm run cap:copy` | Copy web assets only (no native dependency update) |
| `npm run cap:open:android` | Open project in Android Studio |
| `npm run cap:open:ios` | Open project in Xcode |

### `cap:build` internals

```bash
# Equivalent to:
NEXT_PUBLIC_GOVA_WEB_BUNDLE_VERSION=<version> NEXT_PUBLIC_GOVA_API_BASE_URL=<vercel-url> npm run build:static
# verify out/gova-web-manifest.json exactly matches the R2 channel manifest
npx cap sync
```

Implemented in `scripts/cap-build.ts`:

1. Reads the current R2 version and increments its patch number automatically.
2. Creates release notes from the current Cairo date and time.
3. Publishes changed/new files and deletes removed files in the single `app-updates/files` directory.
4. Resolves API URL from `GOVA_CAPACITOR_API_BASE_URL` or `platform/capacitor.defaults.ts` (`https://gova-swart.vercel.app`).
5. Sets `NEXT_PUBLIC_GOVA_WEB_BUNDLE_VERSION`, `NEXT_PUBLIC_GOVA_NATIVE_VERSION`, and `NEXT_PUBLIC_GOVA_API_BASE_URL`.
6. Runs `npm run build:static` (includes `architecture:check` and writes `gova-web-manifest.json`).
7. Publishes the signed manifest last and removes legacy release directories.
8. Downloads and verifies every R2 file by size and SHA-256.
9. Updates Android and iOS to the automatic version.
10. Runs `npx cap sync` only after Android, iOS, local output, and R2 all match.

---

## Production workflow

### Android

```bash
npm run cap:build
npm run cap:open:android
# Build & run from Android Studio
```

### iOS (requires macOS + Xcode)

```bash
npm run cap:build
npm run cap:open:ios
# Build & run from Xcode
```

### Requirements

- Node.js dependencies installed (`npm ci`)
- **Android:** Android Studio, SDK, JDK
- **iOS:** macOS, Xcode, CocoaPods (installed by Capacitor on first sync)

---

## Data access (mobile)

Mobile builds never touch the database directly.

```
UI → Hooks → Client Services → GovaApiClient → HTTPS → Vercel Business APIs → …
```

The API base URL is **baked at build time** into the static bundle via `NEXT_PUBLIC_GOVA_API_BASE_URL`.

| Build command | API source |
|---|---|
| `npm run cap:build` | Always Vercel unless overridden; automatically publishes and verifies R2 |
| `npm run build:static` (manual) | Whatever `NEXT_PUBLIC_GOVA_API_BASE_URL` is at build time |

### Override API URL for a one-off build

```bash
# Windows
set GOVA_CAPACITOR_API_BASE_URL=https://your-preview.vercel.app
npm run cap:build

# macOS / Linux
GOVA_CAPACITOR_API_BASE_URL=https://your-preview.vercel.app npm run cap:build
```

To change the default permanently, edit `platform/capacitor.defaults.ts`.

### CORS on the backend

Capacitor WebViews use origins such as `capacitor://localhost`, `https://localhost` (Android), and `http://localhost`. The Vercel backend must allow these via `GOVA_CORS_ORIGINS` on the server (see data-architecture guide). Default dev origins are included when `GOVA_CORS_ORIGINS` is unset.

---

## Live reload (development)

Live reload is configured **only in Capacitor config** — no changes to application code (`src/`).

1. Start the Next.js dev server:

   ```bash
   npm run dev
   ```

2. Find your machine's LAN IP (not `localhost` — the device/emulator cannot reach it).

3. Set `CAPACITOR_SERVER_URL` and sync:

   ```bash
   # Windows
   set CAPACITOR_SERVER_URL=http://192.168.1.10:3000
   npx cap sync
   npm run cap:open:android
   ```

   ```bash
   # macOS / Linux
   CAPACITOR_SERVER_URL=http://192.168.1.10:3000 npx cap sync
   npm run cap:open:ios
   ```

4. **Return to bundled assets** (production mode in the shell):

   ```bash
   # Unset CAPACITOR_SERVER_URL, then:
   npx cap sync
   ```

`capacitor.config.ts` reads `CAPACITOR_SERVER_URL` and sets `server.url` when present. `cleartext: true` is enabled for `http://` URLs.

---

## Environment variables

| Variable | Used by | Purpose |
|---|---|---|
| `CAPACITOR_SERVER_URL` | `capacitor.config.ts` | Optional dev server URL for live reload |
| `GOVA_CAPACITOR_API_BASE_URL` | `scripts/cap-build.ts` | Override API URL for `cap:build` |
| `GOVA_WEB_BUNDLE_VERSION` | legacy/manual static builds | `cap:build` derives its version from R2 automatically |
| `NEXT_PUBLIC_GOVA_API_BASE_URL` | Next.js static build | Baked into client bundle (set automatically by `cap:build`) |
| `NEXT_PUBLIC_GOVA_WEB_BUNDLE_VERSION` | Next.js static build | Baked into client bundle and local web manifest |
| `NEXT_PUBLIC_GOVA_NATIVE_VERSION` | Next.js static build | Native version used by OTA minimum-version checks |
| `GOVA_MODE=static` | `next.config.ts` | Enables static export (`build:static`) |

See `.env.example` for templates. Capacitor-specific vars do not belong in `src/` — only in platform config and build scripts.

---

## `capacitor.config.ts` reference

| Setting | Value | Notes |
|---|---|---|
| `appId` | `com.gova.app` | Android/iOS bundle identifier |
| `appName` | `GOVA` | Display name |
| `webDir` | `out` | **Always** the static export folder — never `.next` or `public` alone |
| `android.allowMixedContent` | `true` | Allows mixed HTTP/HTTPS during dev reload |
| `server.url` | from `CAPACITOR_SERVER_URL` | Omitted in production (bundled `out/`) |

---

## Deployment targets comparison

| Target | Command | API | Database in client |
|---|---|---|---|
| Local dev (`npm run dev`) | — | Same origin `/api/*` | No |
| Vercel (hosted) | `npm run build` | Same origin | No |
| GitHub Pages (static) | `npm run build:static` | Remote (`NEXT_PUBLIC_GOVA_API_BASE_URL`) | No |
| **Capacitor** | `npm run cap:build` | Vercel (via `cap:build`) | No |

All targets share **identical** `src/` application code.

---

## Architecture contract

Capacitor integration must **not**:

- Add imports of `@capacitor/*` inside UI, Hooks, Services, Repository, or Business APIs
- Add SQLite, Drizzle, Turso, or SQL in the mobile shell
- Change Architecture Contract exceptions
- Hardcode API URLs inside `src/` (use build-time env only)

Platform-specific settings live in:

- `capacitor.config.ts`
- `platform/capacitor.defaults.ts`
- `scripts/cap-build.ts`
- `android/` · `ios/` (generated)

`npm run architecture:check` must remain at **100%**.

---

## Troubleshooting

### White screen or 404 on launch

- Run `npm run cap:build` so `out/`, R2, Android, and iOS are rebuilt and synchronized together.
- Confirm `webDir` is `out` in `capacitor.config.ts`.

### `cap:build` fails with R2 mismatch

- Re-run `npm run cap:build`; it publishes the next automatic version and verifies every R2 object before sync.
- If it still fails, inspect the reported file path. The local `out/gova-web-manifest.json` must match the R2 channel manifest exactly.

### OTA does not apply inside the app

- The app updates only when `remote.version > local.version`.
- If R2 version is equal or lower, the app logs `No OTA update: remote version is not newer`.
- Filter Android Logcat by `GovaOTA` for exact skip/failure reasons.

### API calls fail (network / CORS)

- Verify `NEXT_PUBLIC_GOVA_API_BASE_URL` in the built bundle (check Network tab — requests should go to Vercel).
- Ensure Vercel backend has correct `GOVA_CORS_ORIGINS` or default Capacitor origins allowed.
- On device, use production `cap:build` (not live reload) unless the dev server is reachable on LAN.

### Live reload not connecting

- Use LAN IP, not `127.0.0.1` or `localhost`.
- Phone/emulator and PC must be on the same network.
- Re-run `npx cap sync` after changing `CAPACITOR_SERVER_URL`.

### iOS build fails on Windows

- `ios/` folder can be synced on Windows, but **building requires macOS + Xcode**.

### `architecture:check` fails after Capacitor changes

- Do not import Capacitor or database code into `src/`.
- Keep changes in `platform/`, root config, `scripts/`, and native folders only.

---

## Related documentation

- [branding-ssot.md](./branding-ssot.md) - single-source application icon and native launch-screen policy
- [static-export-policy.md](./static-export-policy.md) - complete static source-file and route allow/ignore policy

- [data-layers/README.md](./data-layers/README.md) — GovaApiClient, layers, CORS, static export
- [platform/README.md](../../platform/README.md) — short platform-layer summary
- [Capacitor docs](https://capacitorjs.com/docs) — upstream framework reference
