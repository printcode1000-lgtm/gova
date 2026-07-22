# Environment Variables

```env
# ── ASOL API (client-safe) ──
NEXT_PUBLIC_ASOL_API_BASE_URL=     # Remote backend (static/Capacitor). Empty = same origin.
NEXT_PUBLIC_ASOL_BASE_PATH=        # Asset base path (GitHub Pages sub-path)

# ── Turso runtime (server-only) ──
TURSO_DATABASE_URL=                # users DB (allusers.db)
TURSO_AUTH_TOKEN=
TURSO_PROFILE_DATABASE_URL=        # profile DB (profile.db)
TURSO_PROFILE_AUTH_TOKEN=

# ── Turso provisioning (build/deploy scripts only) ──
TURSO_API_TOKEN=
TURSO_ORGANIZATION=

# ── Server CORS ──
ASOL_CORS_ORIGINS=
ASOL_SESSION_SIGNING_SECRET=        # Server-only, at least 32 random characters

# ── App mode ──
ASOL_MODE=development              # development | production | static

# ── Capacitor (platform layer) ──
CAPACITOR_SERVER_URL=
ASOL_CAPACITOR_API_BASE_URL=
```

## Cloudflare R2

```env
# Server-only
R2_ACCOUNT_ID=
R2_API_TOKEN=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=asol-storage
R2_ENDPOINT=                         # https://{account_id}.r2.cloudflarestorage.com
R2_LOCATION=WEUR
R2_PUBLIC_URL=                       # Public Dev URL (pub-xxx.r2.dev)
R2_CATALOG_URI=                      # Iceberg catalog (optional)
R2_WAREHOUSE_NAME=                   # Iceberg warehouse (optional)

# Client-safe
NEXT_PUBLIC_R2_PUBLIC_URL=
```

Sync full browser-upload CORS (GET/PUT/POST/DELETE/HEAD) from `ASOL_CORS_ORIGINS`:

```bash
npm run r2:sync:cors
```

## Apple Push Notification service

```env
# Server-only. Encode PEM line breaks as \\n in hosted environment values.
APNS_TEAM_ID=
APNS_KEY_ID=
APNS_BUNDLE_ID=hgh.asol.app
APNS_PRIVATE_KEY=
APNS_PRODUCTION=false
```

## Never expose

`TURSO_API_TOKEN`, `TURSO_AUTH_TOKEN`, `TURSO_PROFILE_AUTH_TOKEN`, `R2_API_TOKEN`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `ASOL_SESSION_SIGNING_SECRET`, `APNS_PRIVATE_KEY`, `VERCEL_TOKEN` — not in client bundles, IndexedDB, localStorage, or logs.

## Vercel deploy

After local provisioning, push all four Turso runtime vars:

```bash
npm run db:push:vercel-env
```

Then redeploy. See [../problems/vercel-build-missing-profile-turso-env.md](../problems/vercel-build-missing-profile-turso-env.md).

## Moving the backend

Change one client variable:

```env
NEXT_PUBLIC_ASOL_API_BASE_URL=https://api.your-domain.com
```
