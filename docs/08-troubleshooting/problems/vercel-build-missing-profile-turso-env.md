# Vercel build failure — Turso profile environment variables not configured

**Date:** 2026-06-27  
**Environment:** Vercel Production (`main`)  
**Solution Status:** Resolved

---

## Symptoms

The `npm run build` command failed on Vercel with the message:

```
❌ Schema sync failed: Error: Turso profile credentials not configured
   (TURSO_PROFILE_DATABASE_URL / TURSO_PROFILE_AUTH_TOKEN)
```

From the build log:

- `db:ensure` succeeded (both `allusers.db` and `profile.db` exist)
- `db:schema:sync` failed when syncing the profile database
- `injected env (0) from .env` — no local variables on Vercel

---

## Cause

After adding a separate database for the profile (`profile.db` → Turso `asol-profile`), the build now runs **two synchronizations**:

| SQLite | Turso | Required Variables |
|--------|-------|-------------------|
| `allusers.db` | `asol-db` | `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` |
| `profile.db` | `asol-profile` | `TURSO_PROFILE_DATABASE_URL`, `TURSO_PROFILE_AUTH_TOKEN` |

On Vercel, only the **users** variables were present. The **profile** variables were not added to the project's **Environment Variables**, while the `schema-sync.ts` script treats CI/Vercel environment (`VERCEL=1`) as mandatory — meaning missing variables stop the build and do not skip synchronization.

---

## Solution

### 1. Add Variables to Vercel

Added the following two variables to all environments (Production, Preview, Development):

```env
TURSO_PROFILE_DATABASE_URL=libsql://asol-profile-....turso.io
TURSO_PROFILE_AUTH_TOKEN=...
```

**Manually:** Vercel → Project → Settings → Environment Variables

**Automatically from local machine** (after `npm run db:provision:turso` and having values in `.env.local`):

```bash
npm run db:push:vercel-env
```

The script: `scripts/push-vercel-turso-env.ts` — pushes the four Turso variables (users + profile).

### 2. Redeploy

After saving variables: **Redeploy** from Vercel dashboard, or:

```bash
npx vercel deploy --prod
```

### 3. Verify Build Success

The build log should show:

```
✅ users schema synchronization completed
✅ profile schema synchronization completed
```

Then `next build` completes without errors.

---

## Prevention

1. When adding a new Turso database, add its variables to Vercel immediately.
2. After `npm run db:provision:turso`, run `npm run db:push:vercel-env`.
3. Review `.env.example` — it should reflect all runtime variables required for the build.

---

## Related Files

- `scripts/schema-sync.ts` — runs `runAllSchemaSyncs` and fails on CI when credentials are missing
- `src/core/provisioning/schema-sync.ts` — synchronization logic for each database
- `doc/system/profile-system.md` — profile database structure
- `doc/system/data-layers/14-environment-variables.md` — environment variables
