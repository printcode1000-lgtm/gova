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

No extra Capacitor plugins are installed (no SQLite, storage, or database plugins).

---

## npm scripts

| Command | What it does |
|---|---|
| `npm run cap:build` | Static export + Vercel API URL + `cap sync` (production mobile build) |
| `npm run cap:sync` | Copy `out/` into native projects and update native config |
| `npm run cap:copy` | Copy web assets only (no native dependency update) |
| `npm run cap:open:android` | Open project in Android Studio |
| `npm run cap:open:ios` | Open project in Xcode |

### `cap:build` internals

```bash
# Equivalent to:
NEXT_PUBLIC_GOVA_API_BASE_URL=<vercel-url> npm run build:static
npx cap sync
```

Implemented in `scripts/cap-build.ts`:

1. Resolves API URL from `GOVA_CAPACITOR_API_BASE_URL` or `platform/capacitor.defaults.ts` (`https://gova-swart.vercel.app`).
2. Sets `NEXT_PUBLIC_GOVA_API_BASE_URL` for the static build.
3. Runs `npm run build:static` (includes `architecture:check`).
4. Runs `npx cap sync`.

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
| `npm run cap:build` | Always Vercel (`platform/capacitor.defaults.ts`) unless `GOVA_CAPACITOR_API_BASE_URL` is set |
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

Capacitor WebViews use origins such as `capacitor://localhost` and `http://localhost`. The Vercel backend must allow these via `GOVA_CORS_ORIGINS` on the server (see data-architecture guide). Default dev origins are included when `GOVA_CORS_ORIGINS` is unset.

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
| `NEXT_PUBLIC_GOVA_API_BASE_URL` | Next.js static build | Baked into client bundle (set automatically by `cap:build`) |
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

- Run `npm run cap:build` (or `build:static` + `cap sync`) so `out/` is fresh.
- Confirm `webDir` is `out` in `capacitor.config.ts`.

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

- [data-layers/README.md](./data-layers/README.md) — GovaApiClient, layers, CORS, static export
- [platform/README.md](../../platform/README.md) — short platform-layer summary
- [Capacitor docs](https://capacitorjs.com/docs) — upstream framework reference
