# EXECUTION ORDER — Package the Five Vercel Accounts

**Read this entire document before you touch a single file.** It is written as a sequence of gated
phases. You may not start a phase before its entry gate passes, and you may not leave a phase before
its exit gate passes. There is no "mostly done". A phase is passed or it is not.

If you are ever unsure what a sentence means, **stop and report**. Do not guess. Do not "interpret
generously". Do not pick the option that is easier to implement. A wrong guess here breaks five
production deployments.

---

## 0. Non-negotiables — read twice

### RULE 0 — outranks everything else in this document

> **The inter-account channel runs on the user's device. Always. On every operating system.
> No account may ever know that another account exists.**

Precisely:

- **Everything** exchanged between accounts crosses this one layer. Not just origin resolution and
  push authorisation — any cross-account flow at all. There is no second path, now or later.
- The layer is deployed to **no** Vercel account and executes on **no** server. It executes on the
  client: web browser, Capacitor **Android** WebView, Capacitor **iOS** WebView, static export, and
  local development.
- `src/core/config/runtime-context.ts` names the axes: `AppPlatform = "web" | "android" | "ios"`,
  `AppDeployment = "local-development" | "web-production" | "static-export"`. The channel must be
  correct on **all combinations**, not on `web` alone.
- No deployed account holds another account's origin, credential, or code path to it. If two
  accounts appear to communicate, that exchange happened on the device.

If any instruction below appears to conflict with Rule 0, **Rule 0 wins, you stop, and you report
the conflict**. You do not resolve it yourself.

### The other eight rules

They live in [`module-isolation-rules.md`](./module-isolation-rules.md). Read that file now. Quote
rules by number in your commit messages and your report. Do not restate them.

### Absolute prohibitions

You will **never**, under any circumstance, for any reason, including if you believe it is needed to
verify your work:

| # | Prohibited | Why |
| :-- | :-- | :-- |
| P1 | `npm run deploy:all`, `npm run *:deploy`, `npm run secrets:backup` | These deploy to production |
| P2 | Any call to `api.vercel.com`, any `vercel` CLI invocation | Same |
| P3 | `git commit`, `git push`, `git tag`, `git reset`, `git checkout --`, `git stash` | The owner controls history |
| P4 | Editing anything under `services/*/generated/` | Generated output — change the generator |
| P5 | Adding `"@asol/<name>/*"` to `tsconfig.json` `paths` | Silently destroys the `exports` seal (see the tsconfig caveat) |
| P6 | Adding `"./*"` to a package's `exports` | Same |
| P7 | Weakening, skipping, or deleting an existing test to make your work pass | If a test fails, your code is wrong |
| P8 | Browser or preview tools | `CLAUDE.md` rule 1 |
| P9 | Deleting or modifying anything in `C:\Users\hesham\Desktop\gova-vercel-baseline-2026-08-16\` | That is the frozen baseline |

### Required reading before Phase 1

1. `note/module-isolation-rules.md` — the eight rules
2. `note/vercel-accounts-backup-inventory.md` — the frozen baseline, **in full**
3. `CLAUDE.md` — working rules
4. `docs/01-architecture/data-layers/26-cloud-accounts.md`
5. `docs/01-architecture/data-layers/16-deployment-targets.md`
6. `docs/05-platform-features/service-bridge-module.md`
7. `docs/05-platform-features/notification-bridge-module.md`
8. `packages/ota-core/` and `packages/storage-core/` — the shape you are copying

---

## 0.5 THE PHASE PROTOCOL — how you are required to work

There are six phases: **0, 1, 2, 3, 4, 5**. They are strictly sequential.

### The three laws

**LAW 1 — No phase begins before the previous one has passed its exit gate.**
Not "is nearly done". Not "is done except for the tests". Passed means: you ran the exit-gate
commands, they exited 0, and you pasted their real output into the ledger. Working on Phase 2 while
Phase 1 is red is a protocol violation, and everything you build on a red phase is discarded.

**LAW 2 — You never assume. You stop and ask.**
If a fact you need is not written in this document, in the inventory, or in the repository, you do
**not** infer it, default it, or pick the likely option. You halt and report the question. Examples
of things you must ask about rather than decide:

- an env key that appears in the code but not in the inventory's table;
- a behaviour in a deploy script that the inventory does not describe;
- whether a difference you found is an intended improvement or a regression;
- any conflict between two instructions;
- anything at all that touches Rule 0.

An unanswered question is a **stop**, not a footnote. "I assumed X because it seemed reasonable" is
the single failure mode this document exists to prevent.

**LAW 3 — A phase is atomic. You do not partially advance.**
You may not take "the easy half" of Phase 3 while leaving the hard half for later. If a phase cannot
be completed, you stop at that phase, leave the repository green at the previous phase's state, and
report. A stopped Phase 3 with Phases 0–2 solid is a good outcome. A half-built Phase 3 that hides
inside a claim of completion is not.

### The ledger — mandatory

Before starting Phase 1, create `note/vercel-accounts-packaging-ledger.md` with the table below.
**Update it immediately after each exit gate, before starting the next phase.** It is how the
reviewer knows where you actually are, and it is the first file that will be read.

```markdown
| Phase | Status | Exit gate run at | Result | Notes |
| :-- | :-- | :-- | :-- | :-- |
| 0 — verify baseline        | NOT STARTED | | | |
| 1 — vercel-deploy-core     | NOT STARTED | | | |
| 2 — service-mirror-core    | NOT STARTED | | | |
| 3 — account-bridge (Rule 0)| NOT STARTED | | | |
| 4 — composition layer      | NOT STARTED | | | |
| 5 — seal & document        | NOT STARTED | | | |
```

Status is exactly one of: `NOT STARTED`, `IN PROGRESS`, `PASSED`, `STOPPED — <reason>`.
There is no `MOSTLY DONE`. There is no `PASSED WITH NOTES`.

Phase 4 has five sub-rows, one per account, each with its own status. `products` does not begin
until `orders` reads `PASSED`.

### The turn ritual — do this every single phase, in this order

1. **Confirm entry.** Read the ledger. Confirm the previous phase reads `PASSED`. If it does not,
   stop.
2. **Re-read the phase.** Read this document's section for the phase you are entering, in full,
   again. Do not work from memory.
3. **Do the work**, and only the work described in that phase. Do not do Phase 3 work "while you are
   in the file" during Phase 2. Out-of-phase changes are reverted.
4. **Run the exit gate literally.** Copy the commands from this document; do not retype them from
   memory and do not substitute equivalents.
5. **Paste the real output** into the ledger. Truncated, summarised, or reconstructed output counts
   as not having run the gate.
6. **Tick every checkbox** in the exit gate. A checkbox you cannot tick is a stop.
7. **Check the stop conditions** for that phase. If one is met, stop — do not work around it.
8. **Update the ledger status**, then and only then begin the next phase's step 1.

### What "stop" means

Stop means: change nothing further, leave the repository green, write what happened and the exact
question in the ledger, and report to the human. It does not mean pick a workaround. It does not
mean lower a threshold. It does not mean disable a test (P7). It does not mean update the baseline
to match your output.

---

## 1. Definitions — so there is nothing to misread

| Term | Means exactly |
| :-- | :-- |
| **account** | One of the five Vercel accounts in the inventory: `gova`, `notifications`, `products`, `orders`, `profiles` |
| **capability** | A task-shaped concern: deployment, mirroring, database access, image storage, crypto |
| **capability package** | A sealed package under `packages/`, following `ota-core`'s shape exactly |
| **account declaration** | A file of pure data about one account. No `if`, no `for`, no function calls, no imports except types |
| **composition module** | The one module per account that wires capability packages together for that account |
| **channel** | The inter-account layer of Rule 0 — the package `@asol/account-bridge` |
| **mirror** | The contents of `services/<name>/generated/`, produced by a sync script |
| **baseline** | `C:\Users\hesham\Desktop\gova-vercel-baseline-2026-08-16\` — read-only, frozen |
| **green** | `npm run lint && npm run typecheck && npm run architecture:check && npm test` all exit 0 |
| **byte-identical** | `diff -r --brief` produces no output other than lines mentioning `manifest.json` |

---

## 2. Target architecture — four layers

Do not collapse them. Do not add a fifth. Each exists because a different thing changes it.

```text
  ┌─ LAYER 4 ── the channel (Rule 0) ──────────────────────────────┐
  │  @asol/account-bridge                                          │
  │  the ONLY code that knows >1 account exists                    │
  │  deployed to no account; runs on the device, every OS          │
  └────────────────────────────────────────────────────────────────┘
        │              │              │              │
  ┌─ LAYER 3 ─┴─ account declarations ┴──────────────┴────────────┐
  │  gova │ notifications │ products │ orders │ profiles           │
  │  pure data: project, token var, env keys, entry points, routes │
  └────────────────────────────────────────────────────────────────┘
        │  LAYER 2 — composition, one per account
        │  the ONLY place that knows this account uses db AND images
  ┌─ LAYER 1 ─┴─ capability packages ─────────────────────────────┐
  │  @asol/vercel-deploy-core │ @asol/service-mirror-core          │
  │  (+ @asol/storage-core, @asol/ota-core — already exist)        │
  │  logic lives here ONCE. capabilities NEVER import each other.  │
  └────────────────────────────────────────────────────────────────┘
```

**Direction of dependency is one-way and absolute:**

```text
layer 4 → (nothing below it: the channel imports NO account, NO capability with credentials)
layer 3 → nothing
layer 2 → layer 1 and layer 3 only
layer 1 → nothing in this diagram
```

A capability package importing another capability package is a **build-breaking error**, not a code
smell. It is what rule 9 exists to prevent: upgrading `@aws-sdk/*` or the Vercel CLI must touch
exactly one package.

### What you build, and what you must NOT build

| Package | Build it? | Contents |
| :-- | :-- | :-- |
| `@asol/vercel-deploy-core` | **YES** | Team resolution, project ensure/create, env upsert, the pinned CLI invocation, deployment polling. Absorbs the 890 duplicated lines from the four deploy scripts. |
| `@asol/service-mirror-core` | **YES** | The import-graph walker producing `generated/`. Absorbs the 781 duplicated lines from the four sync scripts. |
| `@asol/account-bridge` | **YES** | Layer 4. Seals `src/modules/service-bridge` + `src/modules/notification-bridge`. |
| `@asol/storage-core` | **NO — already exists** | Image storage. Depend on it. Do **not** create an `image-core`. |
| `@asol/ota-core` | **NO — already exists** | OTA. Depend on it. |
| `crypto-core` | **ONLY IF PROVEN** | Create only if you find crypto logic genuinely duplicated across accounts and not already owned. If you do not create it, your report must show the evidence that it was not duplicated. |
| `db-core` | **ONLY IF PROVEN** | Same standard. `src/modules/data-access` may already own this. Check before you build. |

**Do not manufacture a package to fill a box in the diagram.** An empty package is worse than no
package: it satisfies rule 7 on paper while violating rule 8.

---

## 3. The phases

Each phase: **ENTRY GATE → WORK → EXIT GATE**. Run the gate commands literally. Paste their real
output into the ledger and your report. Do not paraphrase output. Do not claim a gate passed without
running it.

Apply the turn ritual from §0.5 to every phase without exception, including the ones that look
small. The two commands below are the exit gate for **every** phase; individual phases add more.

```bash
npm run lint && npm run typecheck && npm run architecture:check && npm test
```

```bash
bash /c/Users/hesham/Desktop/gova-vercel-baseline-2026-08-16/verify-against-baseline.sh
```

---

### PHASE 0 — Verify the baseline before you change anything

**ENTRY GATE:** none. This is the first thing you do.

**WORK**

0.1 Confirm the baseline folder exists and is intact:

```bash
bash /c/Users/hesham/Desktop/gova-vercel-baseline-2026-08-16/verify-against-baseline.sh
```

0.2 Confirm the repository is currently green:

```bash
npm run lint && npm run typecheck && npm run architecture:check && npm test
```

0.3 Read all eight documents listed in §0 "Required reading".

**EXIT GATE — all three must hold:**

- [ ] 0.1 printed `RESULT: PASS` and exited 0.
- [ ] 0.2 exited 0.
- [ ] You can state, without re-reading, how many env keys each of the four service accounts holds.

**STOP CONDITIONS — halt and report, do not work around:**

- The baseline script prints `FAIL` **before you have changed anything**. The baseline is stale;
  the owner must refresh it. Do not proceed.
- `npm test` fails before you have changed anything. Report which suite, then stop.

---

### PHASE 1 — `@asol/vercel-deploy-core` + the five account declarations

**ENTRY GATE:** Phase 0 exit gate complete.

**WORK**

1.1 Create `packages/vercel-deploy-core/` mirroring `packages/ota-core/`'s structure:

```text
packages/vercel-deploy-core/
  package.json          name @asol/vercel-deploy-core, private, type module,
                        exports "." only — NO "./*" wildcard (P6)
  src/index.ts          the single public door
  src/tests/index.test.ts
```

1.2 Move into it, unchanged in behaviour, from the four `scripts/deploy-*-service.ts`:

- `resolveTeamId()` — `GET /v2/teams`, first team, undefined on failure
- `withTeam()` — query-param appending
- `ensureProject()` — `GET /v9/projects/:name`, else `POST /v10/projects` with
  `{ name, framework: 'nextjs' }` and **no `gitRepository` field**
- `upsertEnv()` — list, delete every existing match by id, then `POST /v10/.../env` with
  `type: 'encrypted'`, `target: ['production','preview','development']`
- `runVercel()` — the `npm_execpath`/`npx-cli.js` resolution, `shell: false`,
  `cwd: SERVICE_DIR`, and the child env carrying `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, and an
  **overridden `VERCEL_TOKEN`**
- Re-export or absorb `scripts/lib/vercel-deployment-monitor.ts`

1.3 Create five account declarations. Pure data (see §1). Copy every value **verbatim** from the
per-account tables in the inventory:

```ts
{ project, tokenEnvVar, serviceDir, requiredEnv, optionalEnv, mirrorEntryPoints, runtimeAssets }
```

`gova` gets a declaration with no `serviceDir`, no mirror, and no service upload — only its
verification path (`VERCEL_TOKEN`, root `.vercel/project.json`, commit-SHA matching).

1.4 Reduce `scripts/deploy-{notifications,products,orders,profiles}-service.ts` to thin callers:
load env, pick the declaration, call the package. Fix the copy-paste bug noted in the inventory
(`deploy-products-service.ts` prints "Notifications service deploy failed").

1.5 Add `test:vercel-deploy-core` to `package.json` **and to the `build`, `build:static`, and `test`
chains** (rule 3 — see §4).

**EXIT GATE:**

```bash
npm run lint && npm run typecheck && npm run architecture:check && npm test
```

```bash
bash /c/Users/hesham/Desktop/gova-vercel-baseline-2026-08-16/verify-against-baseline.sh
```

- [ ] Both exit 0.
- [ ] Section 3 of the baseline script reports `UNCHANGED` for all four accounts. **This is the
      credential-isolation check and it is the most important line in this document.** `notifications`
      = 11 keys, `products` = 8, `orders` = 18, `profiles` = 21.
- [ ] `grep -rn '"@asol/vercel-deploy-core/' src services scripts packages` returns nothing (rule 5).

**STOP CONDITIONS:**

- Section 3 reports `ADDED`, `optional->required`, or `required->optional` for any account. That is a
  credential-isolation regression. Fix it before anything else.

---

### PHASE 2 — `@asol/service-mirror-core`

**ENTRY GATE:** Phase 1 exit gate complete and green.

**WORK**

2.1 Create `packages/service-mirror-core/` in the same shape.

2.2 Move in the walker, preserving every detail — each of these exists because something broke
without it:

- `SPECIFIER_PATTERNS` must include the **`require()` form**. `data-source-registry.ts` picks its
  database client through a lazy `require`; a walker that understands only `import` copies a
  registry whose branches are all missing.
- `@/` resolves to `src/`; bare specifiers are npm packages and are **not** copied.
- Resolution order: exact path, then `.ts/.tsx/.json/.js`, then `index.*` in a directory.
- A resolved file outside `src/` or `public/` **throws**. Do not soften this to a warning.
- Mirror layout: `src/` → `generated/src`, `public/` → `generated/public`. The category loader
  imports JSON from `public/` with a relative path that climbs out of `src/`; identical depth is what
  keeps that import resolving without rewriting.
- `RUNTIME_ASSETS` copying — files read at runtime via `fs` from `process.cwd()`, invisible to an
  import walker. `products` and `profiles` need `src/config/storage-profiles.json`; `orders` and
  `notifications` need none.
- The `--out <dir>` override. The contract test points it at a throwaway directory so it can detect
  drift **without repairing it** — a check that fixes what it measures fails only once.
- Manifest emission: `{ generatedAt, entryPoints, fileCount, files }`, files sorted, POSIX
  separators.
- `rmSync` of the previous `generated/src` and `generated/public` before writing.

2.3 Reduce the four sync scripts to thin callers over their declarations from Phase 1.

2.4 Add `test:service-mirror-core` to `package.json` and the three chains.

**EXIT GATE — this phase has the strongest available proof. Use it.**

```bash
npm run services:sync
```

```bash
bash /c/Users/hesham/Desktop/gova-vercel-baseline-2026-08-16/verify-against-baseline.sh
```

- [ ] Section 1 reports `IDENTICAL` for **all four** services. Byte-identical, manifest excluded.
- [ ] Section 2 reports `MATCH` for all four — same `entryPoints`, same `fileCount`, same file list.
- [ ] `npm run lint && npm run typecheck && npm run architecture:check && npm test` exits 0.

**STOP CONDITIONS:**

- Any service reports `CHANGED`. Your walker differs from the original. Find out why and fix the
  walker. **Do not** update the baseline, do not add the differing file to an ignore list, and do not
  declare the difference an improvement. The baseline is what shipped.

---

### PHASE 3 — `@asol/account-bridge` (Rule 0)

**ENTRY GATE:** Phase 2 exit gate complete, all four mirrors byte-identical.

This is the phase Rule 0 governs. If you have time pressure, it is not this phase that gets cut.

**WORK**

3.1 Create `packages/account-bridge/` with **exactly two doors**, justified the same way `ota-core`
and `storage-core` justify theirs:

| Door | From | Job |
| :-- | :-- | :-- |
| `.` | `src/modules/service-bridge` | Chooses an **address before a request** |
| `./notifications` | `src/modules/notification-bridge` | Carries a **signed credential after a response** |

Two doors, fixed. No `"./*"` (P6). They stay separate because one chooses an origin and the other
carries a credential — merging them would put a credential path into every route lookup.

3.2 Preserve exactly:

- The **11-entry exact-match route table**. Exact matching, never prefix.
- The documented exclusions, **with their reasons intact as comments**:
  - `/api/orders/:id` — the detail view enriches with profile contacts and store details, which the
    orders account cannot read.
  - `/api/search/sellers` — despite the name it reads profile shards, not products.
  - `/api/profile/reviews` — reads the product database as well as the profile shards.
- **One table, not one module per service.** A second copy is a place for the two to drift.
- The `next dev` guard: local development reads and writes local SQLite; redirecting only its reads
  to a deployed service mixes two datasets — a product can exist locally while the remote service
  correctly returns `productNotFound`.
- Return `null` for anything not in the table, meaning "leave it alone, the main app answers".

3.3 Update every importer of the two old module paths. Delete the old modules only after the new
package is green.

3.4 Write the Rule 0 test suite — **all ten tests in §4.1 are mandatory**.

3.5 Add `test:account-bridge` to `package.json` and the three chains.

3.6 Create `scripts/architecture-check/architecture-check.account-bridge-contract.ts` and wire it
into `scripts/architecture-check.ts`. It walks the **whole repository** — this is the layer that
scans every file, and it is what makes Rule 0 mechanical rather than aspirational.

**EXIT GATE:**

- [ ] All ten Rule 0 tests in §4.1 exist, run in CI, and pass.
- [ ] `architecture:check` fails if you temporarily add `import { resolveServiceOrigin } from
      '@asol/account-bridge'` to `services/orders/src/app/api/orders/route.ts`. **Prove the guard
      works by making it fail, then revert.** A guard you never saw fail is a guard you have not
      tested.
- [ ] Section 5 of the baseline script still reports `clean`.
- [ ] Full green.

**STOP CONDITIONS:**

- You cannot make the channel work on `android` or `ios` without a special case in an account's
  code. Stop and report — that is a Rule 0 conflict, and §0 says you do not resolve it yourself.

---

### PHASE 4 — Layer 2 composition modules

**ENTRY GATE:** Phase 3 exit gate complete.

**WORK — one account at a time, in this order.** Each account is fully green before the next starts.

| Order | Account | Why this position |
| :-- | :-- | :-- |
| 1st | `orders` | Smallest. Single capability (databases). No images, no crypto. |
| 2nd | `products` | Adds image storage via `@asol/storage-core`. |
| 3rd | `profiles` | Same shape as products, more shards. |
| 4th | `notifications` | Hardest: crypto (VAPID, APNs JWT, FCM OAuth, grant secret). Its sync script also diverges most from the others (73 differing lines). |
| 5th | `gova` | Verification path only. |

4.1 For each account, one composition module exposing **one door** — a single `createRuntime()` or an
equivalently narrow named set returning exactly the handles that account's routes need.

4.2 It contains **wiring and validation only**. If you are writing an algorithm, it belongs in layer
1. If you are writing a constant, it belongs in layer 3.

4.3 It is the credential-isolation enforcement point: **the orders composition must be structurally
incapable of constructing an image-storage client, because it never imports one.** Not "does not",
not "should not" — *cannot*.

4.4 Rule 4 — internal validation. Each composition validates its own inputs and treats anything
crossing an external boundary as hostile. It never assumes the rest of the project sends correct data.

**EXIT GATE per account:**

- [ ] Full green.
- [ ] Baseline script `RESULT: PASS`, section 3 still `UNCHANGED`.
- [ ] A test proves this composition cannot reach a capability the account does not own (§4.2).

---

### PHASE 5 — Seal, document, hand over

**ENTRY GATE:** Phases 1–4 complete, every account green.

**WORK**

5.1 **Rule 3 verification.** For each new `test:*-core`, confirm by reading `package.json` that it
appears in `build`, `build:static`, **and** `test`. `scripts/tests/pipeline-coverage.test.ts`
asserts this — make it pass honestly, never by weakening it (P7).

5.2 **Rule 5 — all four enforcement layers, for every new package:**

| Layer | Action |
| :-- | :-- |
| 1 | `exports` in `package.json` — exactly the declared doors, no `"./*"` |
| 2 | ESLint `no-restricted-imports` in `eslint.config.js` — ban deep paths and vendor deps outside the adapter layer |
| 3 | `scripts/architecture-check/architecture-check.<name>-contract.ts`, wired into `scripts/architecture-check.ts` |
| 4 | Contract tests inside the package pinning the exported surface |

5.3 Confirm `tsconfig.json` has **no** `"@asol/*/*"` path wildcard (P5). Read the file and quote the
`paths` block in your report.

5.4 **Rule 6.** Add every new package to `.github/CODEOWNERS`. The `@OWNER` placeholder and branch
protection require the repository owner — record what is still needed, do not invent an owner.

5.5 **Docs** (`CLAUDE.md` rule 3). Update at minimum:
`docs/01-architecture/data-layers/16-deployment-targets.md`,
`docs/01-architecture/data-layers/26-cloud-accounts.md`,
`docs/01-architecture/data-layers/22-scripts-and-workflows.md`,
`docs/01-architecture/data-layers/23-file-map.md`,
`docs/05-platform-features/service-bridge-module.md`,
`docs/05-platform-features/notification-bridge-module.md`.
Update the status table in `note/module-isolation-rules.md` with a column per new package.

5.6 Address the known gaps from the inventory. For each: fixed, or deliberately left with a reason.

- `build`/`build:static` mirror only `notifications` — should now mirror all four
- `test` omits `test:runtime-context` and `test:dev-cloud-backup`
- no `architecture-check.ota-core-contract.ts`
- `deploy-vercel-env.ts` targets a project named `asol`, not `gova`, and needs `VERCEL_ORG_ID`
- the `public-env.ts` latent cross-account leak (§4.1 test T10)

**FINAL EXIT GATE:**

```bash
npm run lint && npm run typecheck && npm run architecture:check && npm test && npm run build:static
```

```bash
bash /c/Users/hesham/Desktop/gova-vercel-baseline-2026-08-16/verify-against-baseline.sh
```

- [ ] Both exit 0. Paste the real output of both into your report.

---

## 4. The mandatory test catalogue

Every test below is required. A missing test is an unfinished phase. Tests go inside their package
(`packages/<name>/src/tests/`), following `packages/ota-core/src/tests/index.test.ts`.

### 4.1 Rule 0 tests — `@asol/account-bridge` (all ten, no exceptions)

| # | Test | Passes when |
| :-- | :-- | :-- |
| **T1** | **Device-only module graph.** Walk the package's full transitive import graph from both doors. | It never reaches `node:*`, `fs`, `path`, `child_process`, `@aws-sdk/*`, `google-auth-library`, `@libsql/*`, or any `*.server.ts`. Dynamic `import()` and `require()` forms are followed too. |
| **T2** | **No account credential.** Scan the same graph for identifier and string matches. | No `VERCEL_*_TOKEN`, no `TURSO_*`, no `*_AUTH_TOKEN`, no `R2_*`, no `*_SECRET*`, no `*_PRIVATE_KEY`. Only `NEXT_PUBLIC_*` values are permitted. |
| **T3** | **Not reachable from a deployment.** Walk every file under `services/**` including `generated/**`, plus every `*.server.ts` and every `src/app/api/**` route in the repo. | None of them imports the channel, at any depth. |
| **T4** | **Every platform × deployment.** Drive the channel across all 9 combinations of `AppPlatform` × `AppDeployment` from `runtime-context.ts`. | Each produces the documented result. **A suite covering only `web` fails this test by definition.** |
| **T5** | **Capacitor origin.** Simulate an Android and an iOS WebView on a `localhost`-like origin. | Routing still resolves to the remote service origins — the localhost origin does not make it fall back to the main app. |
| **T6** | **Static export.** Simulate `static-export`, which has no server of its own. | The channel still resolves; not being able to reach a server is the normal case, not the failure case. |
| **T7** | **Exact matching, never prefix.** Assert `/api/orders` routes to `orders`, and `/api/orders/12345`, `/api/orders/12345/items`, `/api/search/sellers`, `/api/profile/reviews` all return `null`. | All five hold. Additionally, assert that a deliberately prefix-based implementation would fail this test — the test must be capable of catching the mistake it exists for. |
| **T8** | **Exported surface is pinned.** | Door `.` exports exactly `resolveServiceOrigin`; door `./notifications` exports exactly the current notification-bridge surface. Adding an export fails the test. |
| **T9** | **Single path.** Scan every account declaration and every composition module. | None holds another account's origin, project name, or token variable. The knowledge of how accounts relate exists only inside the channel. |
| **T10** | **`public-env` isolation.** | A service mirror does not carry the sibling-account origin fields. This is the latent leak recorded in the baseline: `public-env.ts` declares `notificationsUrl`, `productsUrl`, `ordersUrl`, `profilesUrl` and is dragged into 3 of 4 mirrors through `core/config/index.ts`. `services/orders` is already clean — make the other three match it. |

### 4.2 Credential-isolation tests — layer 2

| # | Test | Passes when |
| :-- | :-- | :-- |
| C1 | Per-account capability closure | Each composition's transitive graph contains **only** the capabilities that account owns. `orders` reaches no image-storage code; `notifications` reaches no product or profile data-access code. |
| C2 | Env key sets are frozen | Each declaration's `requiredEnv`/`optionalEnv` match the inventory exactly. Counts: notifications 11, products 8, orders 18, profiles 21. |
| C3 | Token non-leak | `runVercel`'s child env always overrides `VERCEL_TOKEN` with the account's own token. Assert the main token cannot reach a service invocation. |
| C4 | No token in a mirror | No `generated/` tree contains a token variable name belonging to another account. |

### 4.3 Deploy-core tests — `@asol/vercel-deploy-core`

| # | Test | Passes when |
| :-- | :-- | :-- |
| D1 | Project creation is GitHub-free | The `POST /v10/projects` body never contains a `gitRepository` field. This is what keeps four accounts disconnected. |
| D2 | Upload scope | The CLI is always invoked with `cwd` set to that service's directory, so it writes that folder's `.vercel` and never the repository root's link. |
| D3 | CLI pin | `vercel@59.0.0` is referenced from exactly one place. Assert the pin is not duplicated. |
| D4 | Env upsert semantics | Existing values are deleted by id before the new one is posted; `type: 'encrypted'`; targets `['production','preview','development']`. |
| D5 | Missing required key aborts | A missing required env key exits non-zero **before** any network call. |
| D6 | Missing optional key proceeds | A missing optional key is skipped with a log line and does not abort. |
| D7 | Zero exit is not success | A `READY` verdict comes only from polling the deployment; a zero exit code from the upload process alone is never treated as success. |
| D8 | Import does not deploy | Importing the module runs nothing. Preserve the guard that keeps `npm test` from becoming a release. |

### 4.4 Mirror-core tests — `@asol/service-mirror-core`

| # | Test | Passes when |
| :-- | :-- | :-- |
| M1 | Byte-identity vs baseline | All four mirrors match the frozen baseline, `manifest.json` excluded. |
| M2 | `require()` is followed | A fixture reachable only through a lazy `require` is copied. |
| M3 | Outside-`src/` throws | A fixture importing outside `src/`+`public/` throws, and does not warn-and-continue. |
| M4 | Runtime assets | `products` and `profiles` receive `src/config/storage-profiles.json`; `orders` and `notifications` receive none. |
| M5 | Drift detection does not repair | Running with `--out <throwaway>` detects drift without writing to `services/*/generated/`. |
| M6 | Public-path depth | A `public/` import that climbs out of `src/` still resolves in the mirror layout. |

### 4.5 Structural tests — every new package

| # | Test | Passes when |
| :-- | :-- | :-- |
| S1 | `exports` has no `"./*"` | Rule 5, layer 1 |
| S2 | No deep import anywhere in the repo | `grep` for `@asol/<name>/src` and any undeclared subpath returns nothing |
| S3 | `tsconfig.json` has no `@asol/*/*` wildcard | The tsconfig caveat |
| S4 | `test:*-core` is in `build`, `build:static`, and `test` | Rule 3 — `pipeline-coverage.test.ts` |
| S5 | Package is in `.github/CODEOWNERS` | Rule 6 |
| S6 | No capability package imports another | Rule 9 |
| S7 | SRP | Every file in the package has one job. Flag any file above ~200 lines doing two things. |

---

## 5. Your report

Produce it as `note/vercel-accounts-packaging-report.md`. It must contain:

1. **Gate evidence.** For every phase, the real pasted output of its exit-gate commands. Not a
   summary. Not "all passed". The output.
2. **Byte-identity result**, per service, from Phase 2.
3. **The credential table**: for each of the five accounts, required and optional env keys before
   and after. Any difference, with justification.
4. **Packages created**, and for `crypto-core` / `db-core`, if you did not create them, the evidence
   that the logic was not actually duplicated.
5. **The Rule 0 test results** — all ten, individually listed, with the T-numbers from §4.1.
6. **Proof that the guard fails when it should** — the Phase 3 exit-gate experiment, showing
   `architecture:check` rejecting a deliberate violation.
7. **Every behavioural difference you could not avoid**, with its justification.
8. **The known-gaps table** from §5.6: fixed, or left alone with a reason.
9. **What remains for the repository owner** (rule 6, branch protection).
10. **Anything you did not understand and guessed at.** This section existing is not a failure. It
    being empty when it should not be is.

---

## 6. Self-check before you declare completion

Answer each with a file path and a line number, not with "yes":

- [ ] Where is the one place the Vercel CLI version is pinned?
- [ ] Where is the one place that knows `/api/orders/:id` is not served by the orders account?
- [ ] Which file would I edit to add a sixth Vercel account, and is it only one file?
- [ ] If I upgrade `@aws-sdk/*`, how many packages change? (Rule 9 answer: one.)
- [ ] Which test fails first if someone imports the channel into a route handler?
- [ ] Which test fails first if someone adds `R2_ACCOUNT_ID` to the orders account?
- [ ] Which test fails first if someone changes exact route matching to prefix matching?
- [ ] Which test fails if the channel is made to work on `web` but breaks on `ios`?

If any answer is "none", "not sure", or "several", you are not finished.
