# Environment Variables

```env
# ── GOVA API (client-safe) ──
NEXT_PUBLIC_GOVA_API_BASE_URL=     # Remote backend (static/Capacitor). Empty = same origin.
NEXT_PUBLIC_GOVA_BASE_PATH=        # Asset base path (GitHub Pages sub-path)

# ── Turso runtime (server-only) ──
TURSO_DATABASE_URL=                # users DB (allusers.db)
TURSO_AUTH_TOKEN=
TURSO_PROFILE_DATABASE_URL=        # profile DB (profile.db)
TURSO_PROFILE_AUTH_TOKEN=

# ── Turso provisioning (build/deploy scripts only) ──
TURSO_API_TOKEN=
TURSO_ORGANIZATION=

# ── Server CORS ──
GOVA_CORS_ORIGINS=

# ── App mode ──
GOVA_MODE=development              # development | production | static

# ── Capacitor (platform layer) ──
CAPACITOR_SERVER_URL=
GOVA_CAPACITOR_API_BASE_URL=
```

## Never expose

`TURSO_API_TOKEN`, `TURSO_AUTH_TOKEN`, `TURSO_PROFILE_AUTH_TOKEN`, `VERCEL_TOKEN` — not in client bundles, IndexedDB, localStorage, or logs.

## Vercel deploy

After local provisioning, push all four Turso runtime vars:

```bash
npm run db:push:vercel-env
```

Then redeploy. See [../problems/vercel-build-missing-profile-turso-env.md](../problems/vercel-build-missing-profile-turso-env.md).

## Moving the backend

Change one client variable:

```env
NEXT_PUBLIC_GOVA_API_BASE_URL=https://api.your-domain.com
```
