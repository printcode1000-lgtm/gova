# BINDING SPECIFICATION: close the gaps in the `@asol/storage-core` migration

Repository: `C:\Users\hesham\Desktop\gova` (appId `hgh.asol.app`, "ASOL").

The `packages/storage-core` migration in `note/storage-code-consolidation-command.md` was executed and
**much of it is genuinely good**. An independent audit then found real gaps, a build-breaking defect,
and several places where the delivered work is thinner than the specification required.

This is a **specification, not a brief**. Paths and names below are decided. Execute §4 in order.
Do not stop halfway. Do not ask for confirmation.

---

## 1. WHAT IS ALREADY CORRECT — DO NOT UNDO IT

Verified directly by the auditor, not taken from the previous report:

- `src/core/storage/`, `src/core/provisioning/`, `src/core/config/r2-storage-topology.ts`,
  `scripts/r2-sync-cors.ts`, `scripts/r2-sync-cors-ota.ts`, `scripts/validate-storage-profiles.ts`,
  and `scripts/test-r2-storage-topology.ts` are all **gone**. Correct.
- `packages/storage-core` exists (45 files) with exactly two sealed exports (`.` and `./server`) and
  no `/*` wildcard in either `package.json` or the root `tsconfig.json`. Correct.
- **The per-account duplication is genuinely gone.** A repo-wide grep for
  `uploadProductR2Object`, `deleteProductR2Object`, `productR2ObjectExists`,
  `downloadProductR2Object`, `listProductR2Objects`, `createProductR2S3Client` returns **zero**
  outside generated mirrors. This was the core deliverable and it landed.
- `@aws-sdk/*` appears **zero** times in `src/` and `scripts/`. Deep imports of
  `@asol/storage-core/...` are **zero**. The seal holds.
- All six spec-mandated tests exist and pass: `add-account`, `split-account`, `runtime-purity`,
  `package-independence`, `no-paired-functions`, `public-surface`, plus the ported
  `r2-account-separation`.
- npm script mapping matches the spec exactly; `test:r2-separation` was correctly deleted and folded.
- `.github/CODEOWNERS` and `.github/workflows/native-core.yml` both updated.
- Verified passing by the auditor: `npm run typecheck` (0 errors), `npm run lint` (0 errors,
  10 pre-existing warnings), `npm run architecture:check` (0 violations), `npm run test:storage-core`.

---

## 2. PROHIBITED — each was an actual defect in this repo's migrations

1. **Never report a verification you did not run.** The previous report presented a 9-row table of
   "all mandatory verification steps" while the specification listed 15 — and the two omitted ones,
   `npm test` and `npm run build:static`, are the ones that gate a release. One of them was failing.
2. Never claim a file was deleted, moved, or changed without a command proving it.
3. Never write a docblock describing a check you did not implement.
4. Never leave an `existsSync(new) ? new : old` fallback.
5. **Never add an enforcement rule without migrating everything it forbids, in the same change.**
6. Never assert against a symbol without grepping that it exists first.
7. Never point a script, workflow, or catalog entry at something that does not exist.
8. **Renaming or adding an npm script is never a one-file change.** Check `package.json` (including the
   `test`, `build`, and `build:static` chains), `.github/workflows/**`,
   `src/modules/release-commands/domain/build-command-catalog.ts`, `src/locales/en.json`,
   `src/locales/ar.json`, and `docs/**`.
9. Never delete a test assertion, contract rule, or config key to make a check pass.
10. Never use `any`, `@ts-ignore`, or `eslint-disable` to compile.
11. Never leave CommonJS `require()` in a `"type": "module"` package.
12. Never swallow an error's cause.

---

## 3. THE GAPS — every one verified by command

### G1. The generated service mirrors were left stale — `npm test` fails (BLOCKER)

`npm test` fails at `test:notifications`:
```
AssertionError: services/notifications/generated is stale.
Run `npx tsx scripts/sync-notifications-service-sources.ts` and redeploy:
the mirror no longer matches src/.
+ '3243cc2cb2374c99b0226866d399147966f5572e919742e63cfeb12d10cc2baf'
- '4567fb5fab6c62db0a12a51494463b29bdc04999288436a4e5e21d5bc34bf596'
```

The migration changed files that the four `scripts/sync-*-service-sources.ts` scripts mirror into
`services/{notifications,products,orders,profiles}/generated/`, and the mirrors were never regenerated.
The original specification called this out explicitly (§6.4) and it was still missed.

**Note for reproduction:** the auditor inadvertently ran all four sync scripts while probing (they have
no `--check` flag; passing an unknown argument performs a real sync), so on the auditor's machine the
mirrors are now current and `test:notifications` passes. **The underlying defect is not fixed** — the
mirrors are gitignored build output, so any other checkout, any CI run, and any fresh clone reproduces
the failure.

Why `build:static` masked it: that chain runs `npx tsx scripts/sync-notifications-service-sources.ts`
*before* `test:notifications`, so it regenerates the mirror in passing. `npm test` does not. A defect
that only `npm test` catches is exactly why §2 item 1 exists.

Required:
- Regenerate all four mirrors and confirm `npm test` passes from a clean state.
- Then make this class of failure impossible to miss again: `npm test` must either run the four sync
  scripts the way `build:static` does, or fail with a message naming **all four** scripts to run. Pick
  one, implement it, and say which you chose and why.

### G2. `test:storage-core` is missing from `build` and `build:static` (BLOCKER for release gating)

Verified:
```
in npm test:       true
in build:          false
in build:static:   false
```
Specification §7 Step 10 required all three. **This is the third consecutive migration with this exact
omission** — `test:native-core` and `test:ota-core` were both missed the same way. A broken
`storage-core` therefore does not fail the release build.

Required: add `test:storage-core` to `build` and `build:static`, next to `test:native-core` and
`test:ota-core`. Then add a guard so this cannot recur: a test that asserts every
`test:*-core` script in `package.json` also appears in the `build` and `build:static` chains. Put it in
`scripts/tests/` and chain it into `test:deployment-tools`.

### G3. Dead architecture rules pointing at deleted paths

`src/core/architecture/contract.ts` still contains layer exemptions keyed on paths that no longer
exist, so they can never match:
- line ~298: `importPath.includes('/core/provisioning/r2') || importPath.includes('/core/provisioning/r2-')`
- line ~306-307: `importPath.includes('/core/storage/storage/') || importPath.includes('/core/storage/profiles/')`
- line ~314: `importPath.includes('/core/provisioning/r2-s3-client')`

A rule that cannot match reads as protection while enforcing nothing. Required: rewrite each against
the new package boundary, or delete it if the package `exports` seal now covers it — and say which for
each. Then add a self-check that fails when a path-based contract rule matches zero files repo-wide, so
the next refactor surfaces its own dead rules.

### G4. The test suite is far thinner than §8 required

Delivered: **one** unit test (`unit/account-registry.test.ts`). Specification §8 required these, none
of which exist:

**Unit**
- Credential resolution per account, including **a missing variable failing loudly with the account
  named** — this is the guard against the exact failure mode §6.1 describes (a silent cross-account
  fallback writes to the wrong bucket rather than erroring).
- Storage-profile validation: valid, invalid, unknown provider, duplicate id.
- Image rules, key generation, path building, output-format registry.

**Integration**
- Upload / delete / exists / download / list against **each** account through the parameterised store,
  with a fake S3 layer.
- **Cross-account isolation**: with account A's env removed, A's operations fail and B's succeed.

Required: write all of them. The credential-isolation test is the highest priority — it is the only
automated proof that the account boundary actually holds at runtime rather than only in shape.

### G5. Documentation is a stub, and six docs still describe deleted paths

`docs/01-architecture/storage-core-module.md` is 33 lines with four headings. Specification §9 required
it to contain, and it does not:
- the three accounts and what each holds (`general` = `pic1`, `products` = `gova-storage`,
  `ota` = `ota`);
- why the `ota` account lives in `ota-core` and not here;
- **a worked example of adding a fourth account** — grep for "fourth" returns 0;
- **a worked example of splitting an existing account**, each showing that only data changes;
- the §6 invariants **with their reasoning preserved** — grep for "invariant" returns 0.

These six docs still reference `core/storage`, `core/provisioning`, `r2-s3-client`,
`r2-storage-topology`, or the deleted `test:r2-separation` and were required to be rewritten:
- `docs/02-data-and-storage/image-storage/image-storage-system.md`
- `docs/02-data-and-storage/image-storage/image-storage-architecture-contract.md`
- `docs/05-platform-features/r2-storage-accounts.md`
- `docs/01-architecture/data-layers/25-central-data-access-module.md`
- `docs/02-data-and-storage/product-data-model.md`
- `docs/07-mobile-and-release/capacitor/ota-update-system.md`

Also required and missing: `docs/02-data-and-storage/storage-image-source-picker-system.md`,
`docs/04-ui-components/guides/storage-image-manager.md`, and
`docs/01-architecture/data-layers/22-scripts-and-workflows.md` (script names changed) were named in the
spec — confirm each is accurate or fix it.

### G6. OTA env reads still sit outside `ota-core`

Specification §7 Step 8 required `grep -rn "ASOL_OTA_R2\|getOtaR2" src scripts` to return nothing
outside `packages/ota-core`, with one allowed exception for a script that merely forwards variable
**names**. Actual result:

| Location | What it is | Verdict |
| :-- | :-- | :-- |
| `scripts/push-vercel-turso-env.ts:55-56` | forwards `ASOL_OTA_R2_PUBLIC_URL` / `ASOL_OTA_R2_PREFIX` as **names** to Vercel | the allowed exception — leave it, and note it in the README |
| `src/modules/release-commands/domain/build-command-catalog.ts:54` | declares `ASOL_OTA_R2_BUCKET_NAME` as a required env **name** for the catalog entry | name-only; acceptable, but state it |
| `src/core/config/server-env/server-env.values.turso-env.ts:176-186` | **reads the values at runtime** — `getOtaApprovalServerConfig()` builds the OTA manifest URL from `process.env.ASOL_OTA_R2_PUBLIC_URL` and `ASOL_OTA_R2_PREFIX` | **a real leak — must move** |

`getOtaApprovalServerConfig()` derives the OTA manifest URL, which is OTA's own concern and belongs in
`packages/ota-core`. Its existing comment is worth preserving: *"Falling back to the product or general
bucket would point clients at a manifest on an account that OTA does not own."*

Required: move that resolution into `ota-core`, re-point every consumer, and leave the two name-only
references. Then re-run the §5 probe.

### G7. Undisclosed decision about the CORS payload shape

Specification §7 Step 8 allowed duplicating the small Cloudflare CORS payload shape between the two
packages **only if disclosed in both READMEs and in the report**. Neither README mentions it, and the
report does not either. Required: determine what was actually done — shared, duplicated, or neither —
and document it in both READMEs. If a dependency edge was created between the packages,
`package-independence.test.ts` should have caught it; confirm it still passes and say what the test
actually asserts.

---

## 4. ORDERED TASK LIST

1. **G1** — regenerate the four mirrors; make `npm test` self-sufficient or fail with all four script
   names; confirm from a clean state.
2. **G2** — wire `test:storage-core` into `build` and `build:static`; add the `test:*-core`
   pipeline-coverage guard to `scripts/tests/` and chain it into `test:deployment-tools`.
3. **G6** — move `getOtaApprovalServerConfig()`'s OTA env reads into `ota-core`; re-point consumers.
4. **G3** — rewrite or delete the three dead rule groups in `src/core/architecture/contract.ts`; add the
   zero-match self-check.
5. **G4** — write every missing unit and integration test, credential isolation first.
6. **G7** — establish and disclose the CORS-shape decision in both READMEs.
7. **G5** — rewrite `docs/01-architecture/storage-core-module.md` in full and fix all nine docs.

---

## 5. VERIFICATION — run every command, paste literal output

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
npm run test:deployment-tools
npm run validate-storage-profiles
npm run test:r2-storage
npm run version:validate
npm test
npm run build:static
npm run ota:status
```

`npm test` and `npm run build:static` are **not optional** — they are the two the previous report
omitted, and one of them was failing.

After `build:static`, check `git status public/asol-web-manifest.json` and restore with
`git checkout --` if only the verification build touched it.

**Seal probes — every one must return zero lines:**
```bash
ls -d src/core/storage src/core/provisioning 2>/dev/null
grep -rn "@asol/storage-core/src\|@asol/storage-core/server/" --include="*.ts" --include="*.tsx" src scripts packages
grep -rn "@aws-sdk/" --include="*.ts" --include="*.tsx" src scripts | grep -v "/generated/"
grep -rnE "(uploadProductR2Object|deleteProductR2Object|productR2ObjectExists|downloadProductR2Object|listProductR2Objects|createProductR2S3Client)" --include="*.ts" src scripts packages | grep -v "/generated/"
grep -rn "core/storage\|core/provisioning\|r2-storage-topology" --include="*.ts" --include="*.tsx" --include="*.md" src scripts packages docs README.md | grep -v "/generated/"
grep -n "test:r2-separation" package.json
```

**OTA env leak probe — only the two name-only references may remain:**
```bash
grep -rn "ASOL_OTA_R2\|getOtaR2" --include="*.ts" src scripts | grep -v "/generated/"
# allowed: scripts/push-vercel-turso-env.ts, src/modules/release-commands/domain/build-command-catalog.ts
```

**Pipeline-coverage probe:**
```bash
node -e "const s=require('./package.json').scripts;for(const k of Object.keys(s).filter(k=>/^test:.*-core$/.test(k)))console.log(k, 'build:', s.build.includes(k), 'build:static:', s['build:static'].includes(k), 'test:', s.test.includes(k))"
# every row must be true/true/true
```

**Deep import must fail typecheck:**
```bash
printf 'import * as x from "@asol/storage-core/domain/accounts/account-registry";\nexport const p = x;\n' > src/__probe__.ts
npx tsc --noEmit    # expect: error TS2307 on src/__probe__.ts
rm -f src/__probe__.ts
```

**Do not run** `r2:sync:cors`, `ota:sync:cors`, `ota:publish` without `--dry-run`, any fastlane upload
lane, or `deploy:all`. Those mutate live infrastructure.

---

## 6. REPORTING

Every claim needs its command and literal output. Claims without evidence are treated as false.

1. Each gap G1–G7: what you changed, file by file, with proof.
2. The full §5 command list with literal results — **including `npm test` and `npm run build:static`** —
   labelled **NOT RUN — requires <X>** where applicable.
3. The new test inventory: every file added, and which invariant each protects.
4. The G6 table re-run, showing only the two allowed name-only references remain.
5. The pipeline-coverage probe output.
6. Anything you deliberately did not do, and why. §2 forbids silently choosing an alternative.
