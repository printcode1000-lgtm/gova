# Vercel Accounts — Frozen Baseline Inventory

The reference snapshot of every piece of Vercel code in this repository, taken **before** the
per-account / per-capability packaging work described in
[`vercel-accounts-packaging-command.md`](./vercel-accounts-packaging-command.md).

This document is the baseline the packaging agent's output is reviewed against. If a behaviour
described here is absent, changed, or relocated after the migration and is not explicitly listed as
an intended change in the command, that is a regression.

Companion snapshot: a `git tag` pinning the exact tree (see [Taking the tag](#taking-the-tag)).
The tag preserves the bytes; this document preserves the *reasons*, which is what a diff cannot show.

---

## Scope

**In scope** — the code that talks to Vercel or exists only to be deployed to a Vercel account:

| Group | Files | Lines |
| :-- | :-- | --: |
| Service application code | `services/{notifications,products,orders,profiles}/src/**`, `next.config.ts`, `package.json`, `tsconfig.json`, `.vercelignore`, `stubs/` | ~50 files |
| Deploy scripts | `scripts/deploy-{notifications,products,orders,profiles}-service.ts` | 890 |
| Orchestrator | `scripts/deploy-all.ts` | 585 |
| Mirror scripts | `scripts/sync-{notifications,products,orders,profiles}-service-sources.ts`, `scripts/sync-all-service-sources.ts` | 781 |
| Shared helper | `scripts/lib/vercel-deployment-monitor.ts` | 185 |
| Env push | `scripts/deploy-vercel-env.ts`, `scripts/push-vercel-turso-env.ts` | 161 + |
| Runtime detection | `src/core/config/runtime-context.ts`, `runtime-context.server.ts`, `public-env.ts` | — |
| **Inter-account channel** | `src/modules/service-bridge/**`, `src/modules/notification-bridge/**` | 351 |

**Out of scope for repackaging, in scope for the inventory:**

- `services/*/generated/**` — ~350 machine-generated mirror files. They are outputs, not source.
  They are rebuilt on every deploy and must never be hand-edited or packaged. Their *generator* is
  in scope; their content is not.
- The `gova` account's application code — it is the entire Next.js repository and cannot be
  packaged. Only its **deployment path** is in scope: the `deploy-all.ts` main-deployment branch,
  `db:push:vercel-env`, and the root `.vercel/project.json` requirement.

---

## The five accounts

| # | Vercel account | Project | Source of truth | Trigger | Token |
| :-- | :-- | :-- | :-- | :-- | :-- |
| 1 | `hesham-101` | `gova` | the whole repository | GitHub push | `VERCEL_TOKEN` |
| 2 | `101-0902` | `asol-notifications` | `services/notifications/` | `npm run notifications:deploy` | `VERCEL_NOTIFICATIONS_TOKEN` |
| 3 | products | `asol-products` | `services/products/` | `npm run products:deploy` | `VERCEL_PRODUCTS_TOKEN` |
| 4 | orders | `asol-orders` | `services/orders/` | `npm run orders:deploy` | `VERCEL_ORDERS_TOKEN` |
| 5 | profiles | `asol-profiles` | `services/profiles/` | `npm run profiles:deploy` | `VERCEL_PROFILES_TOKEN` |

### Invariants that must survive the migration

These are load-bearing. Each is currently enforced by construction; after packaging, each needs an
explicit test.

1. **No deployment may call another.** No account holds another's URL and none has a code path to
   one. Every crossing runs in the browser via the service bridge / notification bridge.
2. **Only `gova` is connected to GitHub.** The other four projects are created *without* a
   `gitRepository` field precisely so that only the terminal command can change them.
3. **Only `services/<name>/` is uploaded.** The Vercel CLI runs with `cwd: SERVICE_DIR`, so it
   writes that folder's `.vercel` and never the repository root's link.
4. **Each account holds only its own credentials.** The env key sets below are not a convenience —
   they are the credential isolation boundary.
5. **`VERCEL_TOKEN` (the main account's) must not leak** into a service invocation. Each
   `runVercel` overrides `VERCEL_TOKEN` in the child env with that service's own token.
6. **The Vercel CLI is deliberately not a dependency.** It is invoked as an ephemeral
   `npx --package=vercel@59.0.0` tool. The pin is duplicated across all four deploy scripts and
   must be updated together.

---

## Per-account detail

### 2. `asol-notifications`

| | |
| :-- | :-- |
| Routes | `POST /api/notifications/send`, `GET /api/health` |
| Mirror entry points | `features/notifications/service-runtime.ts`, `core/config/server-env.ts` |
| Mirrored files | 71 |
| Runtime assets | none |
| Required env | `TURSO_NOTIFICATIONS_DATABASE_URL`, `TURSO_NOTIFICATIONS_AUTH_TOKEN`, `ASOL_NOTIFICATION_GRANT_SECRET`, `WEB_PUSH_VAPID_PRIVATE_KEY` (+ public pair) |
| Optional env | `FIREBASE_ADMIN_SERVICE_ACCOUNT_{BASE64,JSON}`, `APNS_TEAM_ID`, `APNS_KEY_ID`, `APNS_BUNDLE_ID`, `APNS_PRIVATE_KEY`, `APNS_PRODUCTION` |
| Turso | `hesham102` only |
| Capability mix | **crypto** (VAPID signing, grant secret, APNs JWT, FCM OAuth), **databases** (notifications shard) |

This is the only service whose sync script diverges materially from the other three (73 differing
lines vs 12–15 for the rest) — it predates them.

### 3. `asol-products`

| | |
| :-- | :-- |
| Routes | `GET /api/products`, `/api/products/reviews`, `/api/search/products`, `/api/search/fields`, `/api/pharmacy-profile-catalog`, `/api/health` |
| Mirror entry points | `features/product/services/product-service.server.ts`, `product-review-service.server.ts`, `features/product-search/services/product-search-{products,fields}.server.ts`, `features/categories/index.ts`, `core/config/server-env.ts` |
| Mirrored files | ~150 |
| Runtime assets | `src/config/storage-profiles.json` (read via `fs` from `process.cwd()` — invisible to the import walker, hence the explicit list) |
| Required env | `TURSO_PRODUCT_DATABASE_URL`, `TURSO_PRODUCT_AUTH_TOKEN` |
| Optional env | `PRODUCT_R2_{ACCOUNT_ID,ACCESS_KEY_ID,SECRET_ACCESS_KEY,BUCKET_NAME,ENDPOINT,PUBLIC_URL}` |
| Turso | `hesham103` only |
| Capability mix | **databases** (product shard), **image storage** (R2 key→URL only; holds no `PRODUCT_R2_API_TOKEN`) |

### 4. `asol-orders`

| | |
| :-- | :-- |
| Routes | `GET /api/orders` (list only), `/api/health` |
| Mirrored files | ~45 |
| Runtime assets | none (`RUNTIME_ASSETS` is empty) |
| Required env | `ORDERS_CORE_DATABASE_URL`, `ORDERS_CORE_DATABASE_AUTH_TOKEN` |
| Optional env | 8 further shard pairs — items, fulfillment, delivery-plans, shipping-quotes, payments, refunds, after-sales, disputes-audit |
| Turso | `hesham104`, 9 shards |
| Capability mix | **databases** (sharded reads) only — no image, no crypto |

### 5. `asol-profiles`

| | |
| :-- | :-- |
| Routes | `/api/profile/{contacts,fulfillment-settings,specialties,store-details,users-by-specialty}`, `/api/health` |
| Mirror entry point | `features/profile/services/profile-service.bootstrap.server.ts`, `core/config/server-env.ts` |
| Mirrored files | ~115 |
| Runtime assets | `src/config/storage-profiles.json` |
| Required env | `PROFILE_CORE_DATABASE_URL`, `PROFILE_CORE_DATABASE_AUTH_TOKEN` |
| Optional env | 6 further shard pairs, plus `R2_{ACCOUNT_ID,ACCESS_KEY_ID,SECRET_ACCESS_KEY,BUCKET_NAME,ENDPOINT,PUBLIC_URL}` and `NEXT_PUBLIC_R2_PUBLIC_URL` |
| Turso | `hesham105`, 7 shards |
| Capability mix | **databases** (sharded reads), **image storage** (general R2 bucket, no API token) |

---

## The duplication this migration exists to remove

Measured with `diff`, using `products` as the reference:

| Pair | Differing lines (deploy) | Differing lines (sync) |
| :-- | --: | --: |
| products ↔ orders | 54 of 221 | 15 of 200 |
| products ↔ profiles | 55 of 221 | 12 of 199 |
| products ↔ notifications | 63 of 221 | 73 of 162 |

Roughly **88% of the deploy scripts and 93% of the sync scripts are identical text**, four times
over. Everything that differs is data, not logic:

- project name, service directory, token variable name;
- the required/optional env key lists;
- the mirror entry points and runtime assets.

That is the exact shape rule 1 describes: one module holding the logic in full, with the per-account
difference expressed as a declaration rather than a copy.

### What is already shared

`scripts/lib/vercel-deployment-monitor.ts` (185 lines) — `vercelDeploymentMetadata`,
`waitForVercelProductionDeployment`, `printDeploymentReport`. It is the only piece already factored
out, and it is the precedent for the rest.

---

## The inter-account channel, as it exists today

The connector layer already exists in partial form. It is **the only code in the repository that
knows more than one account exists**, and it is deployed to no account at all — it ships in the main
app's browser bundle and runs there. That placement is what makes invariant 1 true.

| Module | Lines | Public API | Job |
| :-- | --: | :-- | :-- |
| `src/modules/service-bridge/` | 134 | `resolveServiceOrigin` | Chooses an *address before a request*. One exact-match route table maps 11 read paths to `products` / `orders` / `profiles`, returning `null` for everything else ("the main app answers"). |
| `src/modules/notification-bridge/` | 217 | see `index.ts` | Carries a *signed authorisation after a response* to `asol-notifications`. |

Details that are load-bearing and must not be lost:

- **Exact path matching, never prefix.** `/api/orders` is served by the orders account;
  `/api/orders/:id` is not, because the detail view enriches the order with profile contacts the
  orders account cannot read. A prefix rule would have swept it up. `/api/search/sellers` and
  `/api/profile/reviews` are absent for the same class of reason — they read across two accounts.
- **One table, not one module per service.** The routing rule is identical for every service; a
  second copy would be a place for the two to drift.
- **A `next dev` guard.** Local development reads and writes local SQLite; redirecting only its
  reads to a deployed service would mix two datasets. Static/Capacitor and deployed web builds are
  production builds, so the guard does not weaken the split there.
- The two bridges are deliberately separate: one chooses an origin, the other carries a credential.

---

## `deploy-all.ts` — the orchestrator

585 lines. Its preflight gate runs **before the first git write**, because the push is what makes a
release public:

1. refuses a non-`main` branch;
2. requires `VERCEL_TOKEN` and the root `.vercel/project.json` up front;
3. runs `lint`, `typecheck`, `architecture:check`, `test`, `build:static`;
4. refuses to publish scratch files (`__probe*`, `*.log`, `*.tmp`, `*.bak`, scratchpad paths) —
   `git add -A` stages whatever is in the tree;
5. refuses a downgrade of `releaseId`, `version`, or `minimumNativeVersion` in
   `public/asol-web-manifest.json`;
6. refuses an empty run whose `HEAD` already matches `origin/main`.

Then: `secrets:backup` (`scripts/backup-project-secrets.ts`) → stage → commit
`deploy(main): <ISO>` → push → four sequential service deploys → poll every target until `READY`.
Exits non-zero if any of the five is not verified `READY`.

Escape hatches, all opt-in: `--skip-preflight`, `--allow-scratch-files`,
`--allow-manifest-downgrade`, `--allow-empty`. An unrecognised option aborts.

Covered by `scripts/tests/deploy-all.test.ts`, including that importing the module does not deploy.

---

## Known gaps in the current state

Recorded here so they are not mistaken for damage caused by the migration.

1. **`build` mirrors only one service.** The `build` and `build:static` chains run
   `sync-notifications-service-sources.ts` alone; `products`, `orders`, and `profiles` mirrors are
   refreshed only by their own deploy commands or by `npm run services:sync`.
2. **`test` omits several suites** that exist in `package.json`, including `test:runtime-context`
   and `test:dev-cloud-backup`. This is the rule-3 weakness the isolation rules warn about, already
   present before this work.
3. **No `architecture-check.ota-core-contract.ts`.** `scripts/architecture-check/` has contract
   files for `native`, `native-core`, `notification`, and `storage-core`, but not `ota-core`.
4. **`deploy-vercel-env.ts` targets a project named `asol`**, not `gova`, and requires
   `VERCEL_ORG_ID`. Verify before assuming it is live.
5. **The error message in `deploy-products-service.ts` says "Notifications service deploy failed"** —
   a copy-paste artefact of the duplication described above. Present in more than one script.
6. **Rule 6 is unenforced.** `.github/CODEOWNERS` still carries the `@OWNER` placeholder and branch
   protection is not configurable from code.

---

## Taking the tag

The working tree is **not clean** at the time of writing — `git status` shows modified and deleted
files (notably `scripts/r2-sync-cors.ts`, `scripts/validate-storage-profiles.ts`,
`src/core/config/r2-storage-topology.ts`, `src/core/provisioning/r2-*.ts`). A tag points at a commit,
so tagging `HEAD` right now captures the last deploy commit, **not** what is on disk.

### What the tag does not cover

**`services/*/generated/` is git-ignored** (`.gitignore` lines 84–109). Only **52 of the 434 files**
under `services/` are tracked — the ~379 mirror files that make up most of what is actually uploaded
to Vercel are not in git, so no tag can capture them. `.env` and `.env.local` are ignored too, and
the env vars already set on the Vercel projects live only on Vercel.

The mirror gap is closed by a separate snapshot outside the repository:

```text
C:\Users\hesham\Desktop\gova-vercel-baseline-2026-08-16\
  {notifications,products,orders,profiles}/generated/   379 files, 2.6 MB
  CHECKSUMS.sha256                                      373 files hashed, verified
  README.md                                             how to compare after the migration
```

`manifest.json` is excluded from the checksums because its `generatedAt` timestamp changes every
run. See that folder's `README.md` for the comparison commands.

### Taking the tag itself

Choose one, then run it:

Tag the last committed state (fast, but excludes the uncommitted work):

```bash
git tag -a vercel-baseline-2026-08-16 -m "Frozen Vercel baseline before per-account packaging" HEAD
```

Or commit the current work first, then tag that — this is the accurate baseline:

```bash
git add -A && git commit -m "chore: checkpoint before Vercel account packaging" && git tag -a vercel-baseline-2026-08-16 -m "Frozen Vercel baseline before per-account packaging"
```

Do **not** copy the Vercel code into a `backup/` folder inside the repository: `deploy:all` runs
`git add -A` and would publish it to all five accounts, and `architecture:check` walks every file in
the tree and would report the duplicates.
