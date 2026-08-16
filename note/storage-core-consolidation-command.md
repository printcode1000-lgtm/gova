# BINDING SPECIFICATION: `packages/storage-core` + completing OTA's R2 ownership

Repository: `C:\Users\hesham\Desktop\gova` (appId `hgh.asol.app`, "ASOL").

This is a **specification, not a brief**. Names, paths, signatures, and script names below are
**decided**. Do not redesign them. Do not substitute your own naming. If something here is genuinely
impossible, stop and report it under §13 — do not silently choose an alternative.

Execute §7 in order. Do not stop halfway. Do not ask for confirmation.

---

## 1. THE DECISION THIS SPEC MAKES (read before anything else)

The repository has **three isolated Cloudflare R2 accounts**, defined today in
`src/core/config/r2-storage-topology.ts`:

| Target | Bucket | Holds |
| :-- | :-- | :-- |
| `general` | `pic1` | profile avatars, covers, advertisements, special-order images |
| `products` | `gova-storage` | product images only |
| `ota` | `ota` | OTA manifests, file trees, history, transport bundles |

**The split this spec implements:**

- The **`ota` account moves entirely into `packages/ota-core`.** `ota-core` becomes its sole owner —
  target definition, credentials, CORS, transport. It must **not** depend on `storage-core`.
- The **`general` and `products` accounts move into a new `packages/storage-core`**, built so a
  fourth account, or a split of an existing one, is a **data change, not a code change**.

**Why `ota-core` does not consume `storage-core`:** `ota-core` exists so the release pipeline is
self-contained. Routing its uploads through the image-storage module would re-couple releases to image
storage — the exact cross-module dependency the previous migration removed. Two packages, no edge
between them. `storage-core` must never import `@asol/ota-core`, and `ota-core` must never import
`@asol/storage-core`; §12 tests both directions.

---

## 2. PROHIBITED — each was an actual defect in this repo's previous two migrations

1. **Never claim a file was deleted, moved, or changed without verifying it.** A previous report said
   "all 7 service files deleted" while all 7 existed. Every claim in your report needs a §12 command
   whose literal output you paste.
2. **Never claim a verification you did not run.** A previous report said "APNs keys verified in
   Firebase Console" — impossible for an agent. Anything not executed is **"NOT RUN — requires <X>"**.
3. **Never write a docblock describing a check you did not implement.**
4. **Never copy a file and leave the original.** Moving means the old path is gone.
5. **Never leave an `existsSync(new) ? new : old` fallback.** Pin the new path; assert it exists.
6. **Never add an enforcement rule without migrating everything it forbids, in the same change.** The
   `ota-core` migration added `@aws-sdk` and `google-auth-library` bans and left 6 violations, breaking
   `npm run lint`. Before finishing, run `npm run lint` and fix every file your new rules flag.
7. **Never assert against a symbol without grepping that it exists first.**
8. **Never point a script, workflow, or catalog entry at something that does not exist.** The
   `ota-core` migration left `.github/workflows/native-core.yml` calling a renamed script and left
   `build-command-catalog.ts` pointing at a deleted one, which broke `npm test`.
9. **Renaming an npm script is never a one-file change.** Check, at minimum: `package.json` (including
   the `test`, `build`, and `build:static` chains), `.github/workflows/**`,
   `src/modules/release-commands/domain/build-command-catalog.ts`, `src/locales/en.json`,
   `src/locales/ar.json`, and `docs/**`. The catalog requires a matching
   `releaseConsole.commandDocs.<id>.{title,description,produces,mutates,prerequisites}` key in **both**
   locales or `test:release-commands` fails.
10. **Never delete a test assertion, contract rule, or config key to make a check pass.** A failing
    check is evidence. The `native-core` migration lost a whole feature that way.
11. **Never use `any`, `@ts-ignore`, or `eslint-disable` to make the cutover compile.**
12. **Never leave CommonJS `require()` in a `"type": "module"` package.** The `ota-core` migration
    carried `require("node:fs")` into an ESM package and broke `npm run build:static` outright.
13. **Never swallow an error's cause.** That same break was invisible because the wrapper printed only
    its own message. Any wrapper must surface the underlying error.

---

## 3. ALREADY DECIDED — do not redesign

### 3.1 Account identity is already defined and already guarded
`src/core/config/r2-storage-topology.ts` holds the three targets and
`assertR2StorageTargetFields()`. `src/core/storage/tests/r2-account-separation.test.ts` already guards
the split with this reasoning, which you must preserve verbatim in the moved test:

> *"A fallback across an account boundary is the failure mode: it does not error, it writes somewhere
> else."*

Move this logic. Do not rewrite it.

### 3.2 The provider interface already exists
`src/core/storage/providers/storage-provider.interface.ts` defines `IStorageProvider`
(`upload`, `delete`, `exists`, `resolvePublicUrl`, `list`). Keep this contract.

### 3.3 The extensibility problem is concrete, and it is the reason this package exists
Today every account requires hand-written parallel code:

- `src/core/provisioning/r2-s3-client.ts` (330 lines) has **paired** functions per account:
  `createR2S3Client` / `createProductR2S3Client`, `uploadR2Object` / `uploadProductR2Object`,
  `deleteR2Object` / `deleteProductR2Object`, `r2ObjectExists` / `productR2ObjectExists`,
  `downloadR2Object` / `downloadProductR2Object`, `listR2Objects` / `listProductR2Objects`.
- `src/core/config/server-env/` has paired accessors: `getR2*` / `getProductR2*` / `getOtaR2*`.
- `src/core/storage/providers/` has a near-identical class per account
  (`cloudflare-r2.provider.server.ts`, `cloudflare-r2-products.provider.server.ts`) differing only in
  which paired functions they call.

A fourth account today means writing a third copy of all of it. **`storage-core` must replace this
with one account-parameterised implementation driven by a registry** (§5). That is the deliverable —
not a relocation of the duplication.

---

## 4. EXACT PACKAGE STRUCTURE

```
packages/storage-core/
  package.json
  tsconfig.json
  README.md
  scripts/
    sync-cors.ts                  # entry for npm run r2:sync:cors
    validate-storage-profiles.ts  # entry for npm run validate-storage-profiles
    validate-topology.ts          # entry for npm run test:r2-storage
  src/
    index.ts                      # RUNTIME entry — browser-safe, zero node builtins
    server.ts                     # SERVER entry — node-only
    domain/
      accounts/
        account-id.ts             # the StorageAccountId union, derived from the registry
        account-registry.ts       # THE single source of account identity (§5)
        account-registry.types.ts
      profiles/
        storage-profile.types.ts
        storage-profile-validator.ts
        storage-profile-path.ts
      images/
        image-rules.ts
        image-key-generator.ts
        image-path.ts
        output-format.registry.ts
        stored-image.types.ts
    server/
      providers/
        storage-provider.interface.ts
        r2-account.provider.ts    # ONE account-parameterised R2 provider
        local-storage.provider.ts
        provider-resolver.ts      # profile -> provider, driven by the registry
      transport/
        r2-object-store.ts        # account-parameterised object operations
        r2-presign.ts
        r2-cors-policy.ts
        r2-platform-api.ts
      config/
        account-credentials.ts    # env resolution, account-parameterised
      processing/
        image-processor.ts
      profiles/
        storage-profile-loader.ts
      orchestration/
        image-storage-orchestrator.ts
    adapters/                     # THE ONLY place @aws-sdk/* is imported
      s3-client.adapter.ts
    validation/
      schemas.ts
    errors/
      storage-core-error.ts
      result.ts
    tests/
      unit/
      integration/
      contract/
      index.test.ts               # master runner; must exist before package.json references it
```

**`packages/storage-core/package.json` — exactly these exports, no wildcard:**
```json
{
  "name": "@asol/storage-core",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./server": "./src/server.ts"
  }
}
```

**Root `tsconfig.json` paths — add exactly these two, no `/*` wildcard:**
```json
"@asol/storage-core": ["./packages/storage-core/src/index.ts"],
"@asol/storage-core/server": ["./packages/storage-core/src/server.ts"]
```

**Two entry points**, for the same reason `ota-core` has two: `src/index.ts` is imported by browser
code (profile types, image rules, path helpers) and must never transitively reach a node builtin or
`@aws-sdk`. `src/server.ts` is node/server-only. §12 tests this.

---

## 5. THE EXTENSIBILITY REQUIREMENT — the core of this task

Adding a fourth R2 account, or splitting an existing one, must be **one registry entry plus its
environment variables**. No new provider class. No new client factory. No new env accessor. No
`switch` arm anywhere.

### 5.1 The registry is the single source of truth

`domain/accounts/account-registry.ts` declares every account: its id, its immutable identity
(`accountId`, `endpoint`, `bucketName`, `publicUrl`, `location`, `jurisdiction`), and the **env
prefix** its credentials live under.

- `general` → prefix `R2`
- `products` → prefix `PRODUCT_R2`

Credentials resolve as `<PREFIX>_ACCESS_KEY_ID`, `<PREFIX>_SECRET_ACCESS_KEY`, `<PREFIX>_ENDPOINT`,
`<PREFIX>_BUCKET_NAME`, `<PREFIX>_PUBLIC_URL`, `<PREFIX>_ACCOUNT_ID`, `<PREFIX>_API_TOKEN`.
**Verify the real variable names in `src/core/config/server-env/` before fixing the mapping** — the
existing accessors are `getR2*` and `getProductR2*`, and the actual variable spellings win over the
pattern above. Where a real name does not fit the pattern, record the exception in the registry entry
itself, not in code branches.

`StorageAccountId` is **derived from the registry**, never hand-listed, so a new entry immediately
type-checks everywhere.

### 5.2 Everything else takes an account id as a parameter

- `r2-object-store.ts` exposes `upload`, `remove`, `exists`, `download`, `list` — each taking the
  account id. The paired `*Object` / `*ProductObject` functions are deleted, not kept alongside.
- `r2-account.provider.ts` is **one class** constructed with an account id, replacing both
  `CloudflareR2Provider` and `CloudflareR2ProductsProvider`.
- `provider-resolver.ts` maps a storage profile's `provider` field to an account id via the registry.

### 5.3 Splitting an account must also be data-only

Splitting means pointing some storage profiles at a new account. That is a registry entry plus edits to
`src/config/storage-profiles.json`. The account-separation invariants (§6.1) must be **derived from the
registry**, not hard-coded to today's three names — a fourth account must not require editing the test
to keep it passing.

### 5.4 Prove it
Add `tests/integration/add-account.test.ts` that registers a synthetic `test-account` entry through the
registry's own API and asserts that credential resolution, provider construction, and profile
resolution all work for it **without any other file changing**. This test is the specification of
"extensible" and must fail if someone reintroduces a per-account branch.

---

## 6. INVARIANTS THAT MUST NOT REGRESS

### 6.1 Account isolation
Preserve every assertion in `src/core/storage/tests/r2-account-separation.test.ts`, re-expressed
against the registry:
- Exactly one storage profile may use the products account (`product-default`).
- Every other profile uses the general account.
- The three targets are mutually distinct in `accountId`, `endpoint`, `bucketName`, and `publicUrl`.
- No credential fallback may cross an account boundary. A missing credential must **fail loudly**, never
  silently resolve to another account's client. Add an explicit test for this: with one account's env
  removed, operations on it must error and operations on the others must be unaffected.

### 6.2 Server-only boundaries
Providers, transport, credentials, and the image processor are server-only. The current files carry
`import 'server-only'`; `storage-core/src/server.ts` and everything under `src/server/` must preserve
that guarantee. Node scripts import `@asol/storage-core/server`, which must therefore **not** carry a
literal `server-only` import at the entry — mirror how `ota-core` solved this for
`resolveGooglePlayCredentials`, and state the approach in the README.

### 6.3 The existing architecture contract must keep working
`src/core/architecture/image-storage-contract.ts` restricts who may import the R2 client, who may call
upload/delete, and which client entry and upload route are authorised. Those rules still matter — the
package boundary replaces *where the code lives*, not *who may call it*. Update every path in that
contract to the new locations and keep `architecture:check` enforcing it. Do not delete rules that
still have a subject.

### 6.4 The four generated service trees
`services/{notifications,products,orders,profiles}/generated/**` are gitignored mirrors produced by
`scripts/sync-*-service-sources.ts`. Two of them (`products`, `profiles`) carry their own
`src/config/storage-profiles.json`. If a sync script copies files you moved, update the script and
re-run all four; a stale mirror breaks `npm run build`. `services/*/generated/**` is already excluded
from the `ota-core` lint rules — extend that exclusion to any new rule you add.

---

## 7. ORDERED TASK LIST

**Step 1 — Create the package skeleton** exactly as §4. Add it under the existing
`"workspaces": ["packages/*"]`. Add the two tsconfig paths, no wildcard.

**Step 2 — Build the registry** (§5.1) and derive `StorageAccountId` from it.

**Step 3 — Collapse the transport layer.** Move `src/core/provisioning/r2-s3-client.ts`,
`r2-cors-policy.ts`, `r2-platform-api.ts`, `r2.types.ts` into `src/server/transport/` and
`src/adapters/`, replacing every paired function with one account-parameterised function (§5.2).
`src/core/provisioning/` must cease to exist.

**Step 4 — Collapse the providers.** Replace `cloudflare-r2.provider.server.ts` and
`cloudflare-r2-products.provider.server.ts` with a single `r2-account.provider.ts`. Move
`local-storage.provider.server.ts` and `provider-resolver.server.ts`.

**Step 5 — Move the rest of `src/core/storage/`**: profiles, rules, processing, storage helpers,
types, and the account-separation test. `src/core/storage/` must cease to exist.

**Step 6 — Move the `general` and `products` halves of the topology.** Their entries and
`assertR2StorageTargetFields` move into the registry. See Step 8 for the `ota` entry.

**Step 7 — Move credential resolution.** The `getR2*` and `getProductR2*` accessors in
`src/core/config/server-env/` are replaced by the registry-driven resolver. Delete the originals and
re-point every consumer, including `src/modules/dev-cloud-backup/repositories/r2-backup.repository.server.ts`
(it imports both accounts' credentials and both accounts' object functions) and
`src/modules/data-access/tooling/migrate-r2-image-public-url.ts` and `migrate-r2-cloud-folders.ts`.

**Step 8 — Complete OTA's ownership, inside `ota-core` (not `storage-core`).** These OTA-specific
pieces currently live outside `packages/ota-core` and must move into it:
- the `ota` entry of `R2_STORAGE_TARGETS` in `src/core/config/r2-storage-topology.ts`;
- `getOtaR2CloudflareCredentials`, `getOtaR2S3Credentials`, `getOtaR2PublicUrl`, `getOtaR2Config` in
  `src/core/config/server-env/server-env.values.auth-notifications.ts` (re-exported through
  `src/core/config/server-env.values.ts`);
- `scripts/r2-sync-cors-ota.ts` → `packages/ota-core/scripts/sync-cors.ts`, exposed as a new npm script
  `ota:sync:cors` (add it to the release-command catalog **and both locale files** — §2 item 9);
- the OTA references in `src/core/provisioning/r2-platform-api.ts`, which moves to `storage-core`:
  extract whatever `ota-core` needs so it does not import `@asol/storage-core` (§1). Duplicating a
  small, stable Cloudflare CORS payload shape across the two packages is acceptable **only if** you
  state it explicitly in both READMEs and in your report; a shared dependency edge is not.

After this step, `grep -rn "ASOL_OTA_R2\|getOtaR2" src scripts` must return nothing outside
`packages/ota-core`, except `scripts/push-vercel-turso-env.ts` if it merely forwards variable **names**
to Vercel — inspect it and say which case it is.

**Step 9 — Rewrite every consumer** to `@asol/storage-core` or `@asol/storage-core/server`. At minimum:
`src/app/api/storage/images/upload/route.ts`,
`src/app/api/orders/custom-request-from-profile/route.ts`,
`src/features/storage/**`, `src/features/advertisements/services/home-hero-slider-service.server.ts`,
`src/modules/dev-cloud-backup/**`, `src/modules/data-access/tooling/migrate-r2-*.ts`, and every
component listed by:
```bash
grep -rln "core/storage\|core/provisioning" --include="*.ts" --include="*.tsx" src scripts
```

**Step 10 — npm scripts.** Apply exactly this mapping; delete every old entry.

| Script | New value |
| :-- | :-- |
| `r2:sync:cors` | `npx tsx packages/storage-core/scripts/sync-cors.ts` |
| `validate-storage-profiles` | `npx tsx packages/storage-core/scripts/validate-storage-profiles.ts` |
| `test:r2-storage` | `npx tsx packages/storage-core/scripts/validate-topology.ts` |
| `test:storage-core` | **new** — `npx tsx packages/storage-core/src/tests/index.test.ts` |
| `ota:sync:cors` | **new** — `npx tsx packages/ota-core/scripts/sync-cors.ts` |
| `test:r2-separation` | **delete** — folded into `test:storage-core` |

Add `test:storage-core` to `npm test`, `build`, and `build:static`, and remove every deleted name from
those chains in the same edit.

**Step 11 — Enforcement, all four layers** (mirror the existing `@asol/native-core` and
`@asol/ota-core` blocks in `eslint.config.js`):
1. `exports` per §4 — two doors, no wildcard.
2. ESLint: ban `@asol/storage-core/*` deep paths; move `@aws-sdk/*` ownership so it is allowed only in
   `packages/storage-core/src/adapters/**` and `packages/ota-core/src/publishing/adapters/**`. The
   current rule names `ota-core` as the exclusive owner and exempts
   `src/core/provisioning/r2-s3-client.ts` — that exemption disappears with the file. **Keep the
   `services/*/generated/**` exclusion.** Then run `npm run lint` and fix everything the new rules flag.
3. `scripts/architecture-check/architecture-check.storage-core-contract.ts`, modelled on the existing
   `architecture-check.ota-core-contract.ts`, wired into `scripts/architecture-check.ts`; update
   `src/core/architecture/image-storage-contract.ts` paths (§6.3).
4. The contract tests in §8.

**Step 12 — Governance.** Add `packages/storage-core/**` to `.github/CODEOWNERS`; add
`test:storage-core` to `.github/workflows/native-core.yml`.

**Step 13 — Documentation** (§9).

---

## 8. TESTS — `tsx` entrypoints only, no jest/vitest

`packages/storage-core/src/tests/index.test.ts` must exist and import every test file below it before
`package.json` references it.

**Port intact:** every assertion of `src/core/storage/tests/r2-account-separation.test.ts` and
`scripts/test-r2-storage-topology.ts`, re-expressed against the registry (§6.1), keeping their comments.

**Unit**
- Registry: ids unique; identity fields mutually distinct across accounts; a malformed entry is rejected.
- Credential resolution per account, including a missing variable failing loudly with the account named.
- Storage-profile validation: valid, invalid, unknown provider, duplicate id.
- Image rules, key generation, path building, output-format registry.

**Integration** (fakes for the S3 layer — no live bucket)
- Upload / delete / exists / download / list against each account through the parameterised store.
- Profile → provider → account resolution end to end for every profile in
  `src/config/storage-profiles.json`.
- **Cross-account isolation**: with account A's env removed, A's operations fail and B's succeed.
- **`add-account.test.ts`** (§5.4): a synthetic account works end to end with no other file changed.
- **`split-account.test.ts`**: moving a profile to a different account changes only data, and the
  separation invariants still hold.

**Contract**
- `runtime-purity.test.ts` — the module graph of `src/index.ts` contains no node builtin
  (`node:*`, `fs`, `path`, `child_process`, `crypto`) and no `@aws-sdk/*`.
- `package-independence.test.ts` — `storage-core` never imports `@asol/ota-core`, and `ota-core` never
  imports `@asol/storage-core` (§1).
- `no-paired-functions.test.ts` — scan `packages/storage-core/src` and fail on any identifier matching
  `/(Product|Ota)[A-Z]\w*(Object|Client|Credentials)/`, i.e. the per-account duplication returning.
- `public-surface.test.ts` — exported symbol snapshot; every asserted name exists (§2 item 7).

---

## 9. DOCUMENTATION

**Write** `docs/01-architecture/storage-core-module.md`: the three accounts and what each holds; why
`ota` lives in `ota-core` and not here; the registry as the single source of account identity; **a
worked example of adding a fourth account and of splitting an existing one**, each showing that only
data changes; the two entry points; the §6 invariants with their reasoning preserved.

**Update** `docs/01-architecture/ota-core-module.md` — it now owns the `ota` R2 account end to end,
including `ota:sync:cors`.

**Rewrite** every doc describing moved code:
`docs/02-data-and-storage/image-storage/image-storage-system.md`,
`docs/02-data-and-storage/storage-image-source-picker-system.md`,
`docs/05-platform-features/r2-storage-accounts.md`,
`docs/04-ui-components/guides/storage-image-manager.md`,
`docs/01-architecture/data-layers/22-scripts-and-workflows.md` (script names changed).

**Sweep:**
```bash
grep -rln "core/storage\|core/provisioning\|r2-s3-client\|r2-storage-topology\|test:r2-separation" docs README.md
```

---

## 10. VERIFICATION — run every command, paste literal output

```bash
npm install
npm run lint
npm run typecheck
npm run architecture:check
npm run test:storage-core
npm run test:ota-core
npm run test:native-core
npm run test:notifications
npm run test:release-commands
npm run validate-storage-profiles
npm run test:r2-storage
npm run version:validate
npm test
npm run build:static
npm run ota:status
```

After `build:static`, check `git status public/asol-web-manifest.json` and restore with
`git checkout --` if only the verification build touched it.

---

## 11. SEAL PROBES — every one must return zero lines

```bash
# old trees gone
ls -d src/core/storage src/core/provisioning 2>/dev/null
# old files gone
ls src/core/config/r2-storage-topology.ts scripts/r2-sync-cors.ts scripts/r2-sync-cors-ota.ts \
   scripts/validate-storage-profiles.ts scripts/test-r2-storage-topology.ts 2>/dev/null
# no deep imports
grep -rn "@asol/storage-core/src\|@asol/storage-core/server/" --include="*.ts" --include="*.tsx" src scripts packages
# @aws-sdk only inside the two adapter layers
grep -rn "@aws-sdk/" --include="*.ts" --include="*.tsx" src scripts | grep -v "/generated/"
# OTA R2 config only inside ota-core (see Step 8 for the one allowed exception)
grep -rn "ASOL_OTA_R2\|getOtaR2" --include="*.ts" src scripts | grep -v "/generated/"
# the per-account duplication is gone
grep -rnE "(uploadProductR2Object|deleteProductR2Object|productR2ObjectExists|downloadProductR2Object|listProductR2Objects|createProductR2S3Client)" --include="*.ts" src scripts packages | grep -v "/generated/"
# no stale references
grep -rn "core/storage\|core/provisioning\|r2-storage-topology" --include="*.ts" --include="*.tsx" --include="*.md" --include="*.json" src scripts docs README.md package.json | grep -v "/generated/"
# no dead npm scripts
grep -n "test:r2-separation" package.json
```

**Deep import must fail typecheck:**
```bash
printf 'import * as x from "@asol/storage-core/domain/accounts/account-registry";\nexport const p = x;\n' > src/__probe__.ts
npx tsc --noEmit    # expect: error TS2307 on src/__probe__.ts
rm -f src/__probe__.ts
```

**Do not run** `ota:publish` without `--dry-run`, `r2:sync:cors`, `ota:sync:cors`, any fastlane upload
lane, or `deploy:all`. Those mutate live infrastructure. Report readiness instead.

---

## 12. REPORTING

Every claim needs its command and literal output. Claims without evidence are treated as false.

1. File inventory: moved / created / deleted, old path → new path.
2. Both public surfaces of `storage-core`, runtime vs server made explicit.
3. **Proof of extensibility**: the diff a fourth account would require, and the passing output of
   `add-account.test.ts` and `split-account.test.ts`.
4. **Proof of package independence**: the passing output of `package-independence.test.ts`.
5. Evidence the per-account duplication is gone (§11 probe).
6. Every rewritten call site, grouped by area.
7. Literal results for every §10 command, including **NOT RUN — requires <X>**.
8. Anything you deliberately did not do, and why.

## 13. IF THIS SPEC IS IMPOSSIBLE TO FOLLOW EXACTLY

Complete everything else, then state precisely: what you tried, why it failed, and the two best
options. §2 forbids silently choosing an alternative.
