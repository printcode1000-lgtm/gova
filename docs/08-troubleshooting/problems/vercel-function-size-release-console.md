# Main app deploy fails: release-console function exceeds Vercel's 250MB limit

## Symptom

`npm run deploy:all` reports six isolated services `READY` and the main `gova`
target `ERROR`. The Vercel build itself **succeeds**; the failure is at deploy
time:

```
Build Completed in /vercel/output [3m]
Deploying outputs...
The Vercel Function "api/super-admin/build-jobs/[jobId]/artifacts/[name]/analysis"
is 293.94mb uncompressed which exceeds the maximum uncompressed size limit of 250mb.
```

`deploy:all` surfaces it as `BUILD_UTILS_SPAWN_1: Command "npm run build" exited with 1`,
which points at the build and not at the upload. Read the real log before
diagnosing:

```bash
npx --yes --package=vercel@59.0.0 vercel inspect --logs <deployment-url> \
  --token="$VERCEL_TOKEN" --scope=<team-id>
```

## Cause

The release console reads Android build artifacts off the local filesystem.
Next's file tracing cannot prove which paths a filesystem read will touch, so it
sweeps the repository into that function. Reading the build's own trace shows
what landed in it — 362MB across 8804 files:

```bash
python3 - <<'PY'
import json, os, collections
f = ".next/server/app/api/super-admin/build-jobs/[jobId]/artifacts/[name]/analysis/route.js.nft.json"
d = json.load(open(f)); base = os.path.dirname(f); tot = collections.Counter()
for p in d["files"]:
    ap = os.path.normpath(os.path.join(base, p))
    try: size = os.path.getsize(ap)
    except OSError: continue
    parts = ap.split(os.sep)
    key = os.sep.join(parts[:2])
    if "node_modules" in parts:
        i = parts.index("node_modules"); key = "node_modules/" + parts[i + 1]
    tot[key] += size
for k, v in tot.most_common(10): print(f"{v/1e6:8.1f} MB  {k}")
PY
```

```
 237.2 MB  test_profile/manageProfile
  24.5 MB  out/categories
  10.5 MB  ios/App
  10.5 MB  out/_next
```

`test_profile/manageProfile` was the dominant cause: a local Chrome profile
directory (browser cache, Safe Browsing databases, and on-device ML models; a
single `model.tflite` is 35MB). It is not project source.

Tracked vs untracked policy:

- **Tracked:** launcher scripts and shortcuts under `test_profile/` (`run.ps1`,
  `open-all.cmd`, and the per-account `.cmd` / `.lnk` files). These are
  developer helpers, not application runtime.
- **Gitignored:** `test_profile/manageProfile/` and Chrome cache trees
  (`**/Cache/`, `**/Code Cache/`, `**/GPUCache/`). Those must never be committed.
- **Never uploaded:** `.vercelignore` lists `test_profile/` so even the tracked
  launchers stay off Vercel build machines.

## Fix

Three independent layers, because any one of them can be undone by a later
commit:

1. **`.gitignore`** — ignores `test_profile/manageProfile/` and Chrome caches.
   Launcher scripts remain tracked. The heavy profile data stays on the
   developer's disk and never reaches GitHub.
2. **`.vercelignore`** — ignores the whole `test_profile/` tree so a future
   accidental commit still cannot inflate a hosted function.
3. **`next.config.ts` → `outputFileTracingExcludes`** — the `build-jobs` routes
   no longer trace `test_profile/`, `out/`, `ios/`, `android/`, or `public/`.

Nothing excluded is needed at runtime. Every one of those routes calls
`assertGooglePlayConsoleAllowed()`, which throws
`googlePlayConsoleDevelopmentOnly` outside a local development runtime — a
deployment has no Android build artifacts to analyse. The guard's refusal is
unchanged; only the dead weight is gone. The excluded paths are static assets
(`out/`, `public/` are served by the CDN) and native shells, never code.

## Prevention

`npm run vercel:function-size:check` now runs inside `deploy:all` preflight, between
`build` and `build:static`. It reads the same traces this page shows you how to read
manually and fails before the deployment commit exists, naming the route and its
largest contributors. It honours `.vercelignore`, so it measures what Vercel actually
uploads rather than what happens to sit in the working tree.

- A new API route that reads the filesystem inflates its function by whatever
  the tracer cannot rule out. Check `.next/server/**/<route>.nft.json` after
  `npm run build` when adding one.
- Never commit a browser profile, a local database dump, or build artifacts. If
  a directory is "local tooling", it belongs in `.gitignore` **and**
  `.vercelignore`.
