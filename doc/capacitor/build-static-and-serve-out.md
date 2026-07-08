# Build Static & Serve Out — Developer Reference

## The Core Problem: API Routes in Static Builds

Next.js API routes (`src/app/api/**`) are **server-side only** — they run in a Node.js runtime and cannot be bundled into a static file export. During `build:static`, these routes are removed from the build source tree entirely (see `static-export-policy.md`).

This means every static build needs to know **where to send API requests at runtime**. That destination is controlled by a single environment variable baked in at **build time**:

```
NEXT_PUBLIC_GOVA_API_BASE_URL
```

If this variable is empty at build time, the client falls back to `window.location.origin` — so API calls go to whatever server is currently serving the HTML. This is correct on Vercel and Capacitor WebView, but **breaks when serving `out/` with a plain file server** (like the old `http-server` or VS Code Live Server), because those servers have no `/api` handler.

---

## How the API URL is Resolved at Runtime

Source: `src/core/api/gova-api-config.ts`

```
Priority 1: NEXT_PUBLIC_GOVA_API_BASE_URL  ← baked into JS bundle at next build time
Priority 2: window.location.origin + basePath  ← runtime fallback
```

Because `NEXT_PUBLIC_*` variables are baked at **build time** (not runtime), the API destination must be decided before `next build` runs.

---

## How the Proxy Server Works (`scripts/serve-static.ts`)

`serve-static.ts` is the correct way to serve `out/` locally. It is a Node.js HTTP server that:

1. Serves static files from `out/` for all non-API requests
2. **Transparently proxies `/api/*` to an upstream backend** (Vercel or localhost)
3. Strips the `Origin` header so that CORS policies on the remote API do not reject local preview requests
4. Returns `502` with a JSON error body if the upstream is unreachable

The proxy target is resolved in this order:

```
1. GOVA_STATIC_PREVIEW_API_BASE_URL   ← set in VS Code launch config env block
2. NEXT_PUBLIC_GOVA_API_BASE_URL      ← general fallback
3. CAPACITOR_API_BASE_URL             ← hardcoded = "https://gova-swart.vercel.app"
```

Priority 3 guarantees the proxy always has a valid upstream — `serve:out` works even with no environment variables configured.

---

## All Scripts

| Script | API URL baked in? | Intended use |
|---|---|---|
| `build:static` | ❌ Empty (origin fallback) | Used by `cap:build` and Vercel CI — those inject the URL themselves |
| `build:static:local` | ✅ `https://gova-swart.vercel.app` | Local dev/test of static output against production API |
| `serve:out` | N/A (serve only) | Serves `out/` via the proxy-capable `serve-static.ts` |
| `preview:static` | N/A (serve only) | Alias for `serve:out` — identical script |

---

## All VS Code Launch Configurations

### 1. `Build Static (Dev — with Vercel API)`

```json
"runtimeArgs": ["run", "build:static:local"],
"env": { "NEXT_PUBLIC_GOVA_API_BASE_URL": "https://gova-swart.vercel.app" }
```

**What it does:**
- Runs `npm run build:static:local`
- `cross-env` injects `NEXT_PUBLIC_GOVA_API_BASE_URL=https://gova-swart.vercel.app` before building
- The Vercel URL is baked permanently into every JS chunk in `out/`

**When to use:**
- Testing a full static build locally with real production data
- Verifying a new page or component renders correctly after static export
- Pairing with **Serve Out (proxy → Vercel API)** for a complete local preview

**Output:** `out/` with Vercel API URL embedded in bundles.

---

### 2. `Build Static (Plain — for cap:build)`

```json
"runtimeArgs": ["run", "build:static"]
```

**What it does:**
- Runs `npm run build:static` with **no** `NEXT_PUBLIC_GOVA_API_BASE_URL`
- The API URL falls back to `window.location.origin` at runtime
- `cap:build.ts` and `cap:build:local.ts` call this script and inject their own API URL

**When to use:**
- Before running **Capacitor Build** or **Capacitor Build Local**
- Before **OTA Publish** (Vercel CI provides the URL via project environment variables)
- When the API URL will be injected by a downstream step

> ⚠️ Do NOT open `out/` in a browser after this config without pairing it with a Serve Out launch config. Without a baked URL, every `/api/*` request will attempt to reach `127.0.0.1:<port>/api/...` and get a 404.

---

### 3. `Serve Out (proxy → Vercel API)`

```json
"runtimeArgs": ["run", "serve:out"],
"env": {
  "GOVA_STATIC_PREVIEW_API_BASE_URL": "https://gova-swart.vercel.app",
  "PORT": "5500"
}
```

**What it does:**
- Runs `scripts/serve-static.ts` on `http://127.0.0.1:5500`
- Serves static files from `out/`
- Proxies every `/api/*` request to `https://gova-swart.vercel.app`

**When to use — and what to pair with:**

| Build step used first | This serve config result |
|---|---|
| Build Static (Dev — with Vercel API) | API URL is baked AND proxied — both routes lead to Vercel ✅ |
| Build Static (Plain — for cap:build) | Proxy rescues the missing baked URL — API still reaches Vercel ✅ |

**This config eliminates the 404 error:**
```
GET http://127.0.0.1:5500/api/profile/users-by-specialty?... 404 (Not Found)
```

---

### 4. `Serve Out (proxy → localhost:3000)`

```json
"runtimeArgs": ["run", "serve:out"],
"env": {
  "GOVA_STATIC_PREVIEW_API_BASE_URL": "http://localhost:3000",
  "PORT": "5500"
}
```

**What it does:**
- Same as above, but proxies `/api/*` to a **locally running Next.js dev server** on port 3000
- Real auth, real database, real file uploads — no Vercel dependency

**When to use:**
- Developing an API endpoint change and testing it against the static front-end simultaneously
- When Vercel is unavailable or you need to inspect server-side logs locally
- Debugging a data discrepancy between dev and production

**Required prerequisite:** The `Dev Server` launch config must already be running.

---

## Complete Scenario Guide

### Scenario A — Test static build against production data

**Goal:** Confirm the app works as it would on a device, using real production data.

```
Step 1: Run "Build Static (Dev — with Vercel API)"
Step 2: Run "Serve Out (proxy → Vercel API)"
Step 3: Open http://127.0.0.1:5500
```

Both the baked URL and the proxy point to Vercel — API calls succeed from all paths.

---

### Scenario B — Test static build against local dev server

**Goal:** Develop API changes locally and test the static front-end against them.

```
Step 1: Run "Dev Server"                            → Next.js on localhost:3000
Step 2: Run "Build Static (Plain — for cap:build)"  → produces out/
Step 3: Run "Serve Out (proxy → localhost:3000)"     → static UI on :5500, API on :3000
Step 4: Open http://127.0.0.1:5500
```

The static HTML/JS/CSS is served from `out/` but every `/api/*` call is forwarded to the local Next.js dev server. Database, auth, and file operations behave exactly as in full development mode.

> Note: The static bundle was built without a baked API URL, so `window.location.origin` would give `http://127.0.0.1:5500`. The proxy intercepts those calls before they 404 and forwards them to `localhost:3000`.

---

### Scenario C — Capacitor / Android / iOS build

**Goal:** Build the mobile app bundle.

```
Step 1: Run "Capacitor Build"
```

`scripts/cap-build.ts` internally calls `build:static` with `CAPACITOR_API_BASE_URL` already set. No separate serve step is needed — Capacitor's WebView loads assets from the device filesystem and calls the injected URL for APIs.

---

### Scenario D — OTA Publish

**Goal:** Deploy a new web bundle to production without a native app store update.

```
Step 1: Vercel CI builds automatically on push to main
        (Vercel injects NEXT_PUBLIC_GOVA_API_BASE_URL via project env vars)
Step 2: Run "OTA Publish" locally to push the bundle to Cloudflare R2
```

---

## Why the Old `serve:out` Broke

The old script was:

```json
"serve:out": "npx http-server out -p 5500 -o /profile?mode=edit"
```

`http-server` is a plain static file server with no request routing and no proxy. When the browser loaded a page and then called `/api/profile/users-by-specialty`, the request went to `http://127.0.0.1:5500/api/...` which `http-server` answered with a 404.

The fix replaces `http-server` with `scripts/serve-static.ts`, which was already written with a full transparent proxy but was only exposed through `preview:static` and not `serve:out`.

---

## Environment Variable Reference

| Variable | Where set | Consumed by |
|---|---|---|
| `NEXT_PUBLIC_GOVA_API_BASE_URL` | Build script / CI / `.env.local` | Baked into JS bundle at `next build` time |
| `GOVA_STATIC_PREVIEW_API_BASE_URL` | VS Code `env` block | `scripts/serve-static.ts` proxy (runtime) |
| `GOVA_API_BASE_URL` | Legacy alias | Same effect as `NEXT_PUBLIC_GOVA_API_BASE_URL` |
| `PORT` | VS Code `env` block | `serve-static.ts` listen port (default `5500`) |
| `HOST` | Optional | `serve-static.ts` bind address (default `127.0.0.1`) |

