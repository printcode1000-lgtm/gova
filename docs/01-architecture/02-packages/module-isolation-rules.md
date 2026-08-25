# Module Isolation Rules

## Purpose

The binding contract for every sealed package and every application file. Agents MUST read this before any change under `packages/` or any infrastructure-touching change under `src/`. Capability ownership detail defers to [capability-map.md](../08-reference/capability-map.md) — do not duplicate ownership tables here.

## Scope

All 41 packages in `CAPABILITY_PACKAGES`, all application layers under `src/`, service mirrors under `services/`, and scripts subject to architecture scan. Database operational procedures: [docs/02-data-and-storage/](../../02-data-and-storage/).

## Source Map

| Artifact | Path |
|---|---|
| Registry (41 packages) | `packages/architecture-core/src/registry/capability-registry.ts` |
| Application features | `packages/architecture-core/src/registry/application-features-registry.ts` |
| Scan runner | `packages/architecture-core/src/runner.ts` |
| CLI | `scripts/architecture-check.ts` |
| Docs generator | `npm run architecture:docs` → `packages/architecture-core/src/docs/generate-architecture-docs.ts` |
| Layer contract | `packages/architecture-core/src/contracts/contract.ts` |
| ESLint import bans | `eslint.config.js` |
| Browser composition root | `src/core/composition/browser-ports.ts` |
| Server composition root | `src/core/composition/server-ports.ts` |

## Related Documents

- [Capability Map](../08-reference/capability-map.md) — canonical ownership (consult before editing any capability)
- [Mandatory Gateways](../05-capability-enforcement/mandatory-gateways.md)
- [Architecture Check](../07-enforcement/architecture-check.md)
- [Application Layers](../10-application-layers/README.md)

## Change Impact

Rule changes require ADR under [09-decisions/](../09-decisions/), registry updates, enforcement code changes, and agent instruction updates (`AGENTS.md`, `.cursor/rules/`).

---

## The nine rules

### Rule 1 — Core module

One module holds the sensitive logic in full. The rest of the project never touches its internal files.

**Agent action:** Put domain meaning, validation, and infrastructure calls inside the owning `@asol/*-core` package. Application code calls through declared doors only.

### Rule 2 — Declared public API (doors)

Interaction goes through `package.json` `exports` — no side doors. A package may have multiple doors when each is explicit and tested (e.g. `@asol/data-core` has 33 doors; `@asol/page-save-core` has exactly 1).

**Agent action:** Add new surface only as a new export key. Never expose internals via relative paths or tsconfig wildcards.

### Rule 3 — Tests gate the build

Unit and integration tests MUST run in `npm run build`, `npm run build:static`, or `npm test`. A test that does not gate release does not satisfy this rule.

**Agent action:** Ensure `test:<package>` is in the build chain. Compositions use collective `test:compositions`.

### Rule 4 — Internal validation

The module validates its own inputs at boundaries. External callers are treated as hostile.

**Agent action:** Validate at package public functions and port implementations, not only at UI forms.

### Rule 5 — No deep imports

Only declared doors are importable. Enforced by four independent layers (see [Enforcement stack](#enforcement-stack)).

**Agent action:** Never `import … from '@asol/foo/src/…'` or `from '../../packages/foo/…'`.

### Rule 6 — Branch and release gates

`main` is the only branch. Release quality is gated by local npm scripts in the build chain, not by GitHub Actions. The only GitHub workflow is docs-only and path-filtered to `docs/**`; see [github-ci-policy.md](../../07-mobile-and-release/github-ci-policy.md).

**Agent action:** Commit and push to `main`. Run `npm run build` or at minimum `npm run architecture:check` before claiming done. See ADR-0006.

### Rule 7 — Independent package

Each capability lives in `packages/<name>/` as an independent npm package. Other code depends on declared doors only — as if third-party.

Composition packages (`mayImportApp: true`) are the exception: they MAY import `@/features/*` to wire ports. The reverse — app reaching into composition internals — remains forbidden.

**Six compositions with `mayImportApp: true`:** `notifications-composition`, `orders-composition`, `products-composition`, `profiles-composition`, `submain-composition`, `sub2main-composition`.

### Rule 8 — Single responsibility per file

Every source file has one clear job and one primary reason to change. When a second unrelated concern appears, split into a new file.

**Agent action:** Do not combine UI + API + domain logic + unrelated helpers in one file. Barrel/index files re-export only.

### Rule 9 — Dependency-upgrade isolation

Upgrading Capacitor, AWS SDK, Android Gradle, or similar MUST require changes only inside the owning package.

**Agent action:** Before moving a dependency into a package, check whether tooling discovers it from the root `package.json` (e.g. Capacitor plugin discovery — use `includePlugins` in `capacitor.config.ts`, owned by `native-core` via `ROOT_VENDOR_OWNED_FILES`).

---

## Package inventory (summary)

**41 sealed packages** across five registry layers:

| Layer | Count | Packages |
|---|---|---|
| `capability` | 33 | All `*-core` except `architecture-core` |
| `composition` | 6 | `*-composition` |
| `declarations` | 1 | `account-declarations` |
| `bridge` | 1 | `account-bridge` |
| `enforcement` | 1 | `architecture-core` |

Full inventory with doors and test gates: [package-catalog.md](../08-reference/package-catalog.md).  
Ownership statements: [capability-map.md](../08-reference/capability-map.md).

---

## Layer interaction rules

```text
  enforcement   architecture-core     rules + scan
  bridge        account-bridge          device-only; knows multiple accounts
  declarations  account-declarations    pure data; imports NOTHING
  composition   *-composition (×6)      wires account runtime; mayImportApp
  capability    *-core (×33)            owns capabilities once
```

### Critical edges

| From | To | Why allowed |
|---|---|---|
| `vercel-deploy-core` | `account-declarations` | Declarations import nothing — safe data-only direction |
| `*-composition` | `account-declarations/<account>` | Per-account door avoids cross-account env leakage |
| `notifications-composition` | `notifications-core` | Composition wires delivery capability |
| `map-core`, `ota-core`, `account-bridge` | `native-core` | Platform identity owned once (rule 9) |
| `data-core` | other `*-core` packages | Layer-1 domain composition inside DB owner |

### Forbidden directions

- Capability package → `@/…` (`checkPackageAppImportContract`)
- Any file → vendor SDK not owned by importer's package (`checkVendorOwnershipContract`)
- Application UI → `@asol/page-save-core` deep paths (single-door gateway)
- Composition → `account-declarations` barrel (must use per-account door)

Inter-package matrix: [dependency-map.md](../08-reference/dependency-map.md).

---

## Mandatory gateways

Bypassing these is a build failure:

| Capability | Owner | Enforcement |
|---|---|---|
| Database (Drizzle, SQLite, Turso) | `@asol/data-core` | ESLint + vendor ownership + native contract |
| Object storage (R2/S3) | `@asol/storage-core` | ESLint + storage contract |
| Capacitor / native | `@asol/native-core` | ESLint Capacitor ban + vendor registry |
| Page-authored writes | `@asol/page-save-core` | Single-door check + write-surface tests |
| Push (Web Push, FCM, APNs) | `@asol/notifications-core` | Notification contract |
| OTA publish/update | `@asol/ota-core` | ESLint runtime/publishing split |

Detail: [mandatory-gateways.md](../05-capability-enforcement/mandatory-gateways.md).

---

## Ports and wiring

Capability packages declare **ports** (interfaces). Exactly one application module per port family implements and registers them at composition roots:

| Root | File | Registers |
|---|---|---|
| Browser | `src/core/composition/browser-ports.ts` | OTA, account-bridge, data-core browser, page-save, page-snapshot, system-logs, observability, application cycle-breaking ports |
| Server | `src/core/composition/server-ports.ts` | storage, data-core, orders, OTA server, notifications, system-logs, observability, application cycle-breaking ports |

`src/core/composition/tests/ports-registry.test.ts` asserts every seam is listed — adding a port without registration fails CI.

Application wiring modules live under `src/features/**/` (e.g. `data-core-ports.ts`, `storage-core-ports.ts`). Only these modules may know both type worlds.

Detail: [ports-and-contracts.md](../03-dependencies/ports-and-contracts.md), [composition-roots.md](../04-composition/composition-roots.md).

---

## Enforcement stack

Rules 2, 5, and 7 are enforced by **four independent layers** — any one alone is bypassable:

| # | Layer | Mechanism |
|---|---|---|
| 1 | Export maps | `package.json` `exports` — no `"./*"` wildcards |
| 2 | ESLint | `no-restricted-imports` in `eslint.config.js` |
| 3 | Architecture scan | `npm run architecture:check` via `@asol/architecture-core` |
| 4 | Contract tests | Per-package `test:*-core` and composition tests |

### Architecture scan coverage

`runArchitectureCheck()` walks:

- `src/` — seal, vendor ownership, system logs, native surface
- `packages/` — seal, app-import ban, vendor ownership
- `scripts/` — data access ownership, account bridge, seal
- `services/` — seal, vendor ownership, notification module contract

Preflight (in CLI only): storage profile validation, category data validation, GitHub CI policy.

Gates run via npm scripts in `build`, `build:static`, `verify:*`. GitHub Actions is docs-only. See [architecture-check.md](../07-enforcement/architecture-check.md) and [github-ci-policy.md](../../07-mobile-and-release/github-ci-policy.md).

---

## Application layer contract

Application code follows a enforced stack (no shortcut paths):

```text
UI → Hooks → Client Services → AsolApiClient → Business API
  → Server Services → Query/Command → Repository → Database Client → SQLite/Turso
```

UI MUST NOT import repository, Drizzle, or server services. Full layer rules: [10-application-layers/](../10-application-layers/README.md).

---

## Vendor ownership

`vendorModules` in the registry lists SDKs each package alone may import. Derived list: `OWNED_VENDOR_MODULES`.

| Vendor | Owner(s) |
|---|---|
| `better-sqlite3`, `@libsql/client`, `drizzle-orm/*` | `@asol/data-core` |
| `@aws-sdk/client-s3` | `@asol/storage-core`, `@asol/ota-core` (distinct jobs) |
| `@capacitor/*`, `@capawesome/*`, `@capgo/*` | `@asol/native-core` |
| `web-push`, `google-auth-library` | `@asol/notifications-core` (FCM); also `ota-core`, `google-play` paths |
| `maplibre-gl` | `@asol/map-core` |
| `sharp` | `@asol/branding-core` |

Root-owned files: `capacitor.config.ts` → `native-core` (`ROOT_VENDOR_OWNED_FILES`).

Detail: [infrastructure-ownership.md](../05-capability-enforcement/infrastructure-ownership.md).

---

## Agent checklist (before any package change)

1. Look up capability in [capability-map.md](../08-reference/capability-map.md) — confirm you are editing the owner.
2. Identify allowed doors in [package-catalog.md](../08-reference/package-catalog.md).
3. Use ports for app dependencies — wire only in `src/features/**/` or composition roots.
4. Run `npm run test:<package>` and `npm run architecture:check`.
5. Update docs if behavior, doors, or ownership changed.

---

## Invariants

1. Exactly one owner per capability ([capability-map.md](../08-reference/capability-map.md)).
2. 41 registry entries match 41 `packages/` folders.
3. Unregistered packages and undeclared vendor imports fail `architecture:check`.
4. `@asol/page-save-core` remains single-door.
5. Capability packages never import `@/`.
6. `account-declarations` imports nothing.
7. Composition packages are the only packages with `mayImportApp: true`.
8. Every file has single responsibility (rule 8).
9. Dependency upgrades stay inside the owning module (rule 9).
