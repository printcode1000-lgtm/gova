# Service smoke fails after successful service builds

## Symptom

`services:build` succeeds, but `smoke:services` fails when a service starts with missing Turso configuration, or a server service reports that database access is unavailable during static export.

## Cause

The service build and smoke scripts inherited only the ambient shell environment. Release credentials are sourced by release tooling from the single local file `.env.local`, so service smoke must receive the same canonical values rather than depend on ambient-shell accidents. A preceding static build could also leave `ASOL_MODE` / `NEXT_PUBLIC_ASOL_MODE` in the inherited environment and make a server service build as a static target.

## Fix

Server-service build and smoke commands use `createServiceReleaseEnvironment()`. It clones the caller environment, fills missing release values through `@asol/env-core/process`, then removes both static-mode markers before any service build or start. Existing process values keep precedence.

`NODE_ENV=production` is added only when `next start` runs, not during dependency installation, so `npm ci` keeps the build dependencies required by an isolated Vercel service.

## Verification

```bash
npx tsx scripts/tests/service-release-environment.test.ts
npm run services:build
npm run smoke:services
```

Do not hard-code secrets, copy credentials into service folders, or weaken the data-reaching smoke probes.
