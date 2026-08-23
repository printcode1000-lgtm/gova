# Repository-wide Architecture Enforcement

This document is the standing description of how capability ownership is
**technically enforced** across the repository. It complements
[module-isolation-rules.md](./module-isolation-rules.md) and
[architecture-core-module.md](./architecture-core-module.md).

## Final invariant

> Every significant capability has exactly one architectural owner, one controlled
> public contract, and no unauthorized alternative implementation path.

If a developer or coding agent tries to bypass an owning package, `npm run architecture:check`
must reject that architecture.

## Ownership registry

`packages/architecture-core/src/registry/capability-registry.ts` is the single inventory of:

| Field | Meaning |
| :--- | :--- |
| `folder` / `name` | Sealed package identity |
| `owns` | The capability statement |
| `layer` | `capability` · `composition` · `declarations` · `bridge` · `enforcement` |
| `vendorModules` | SDKs this package alone may import |
| `mayImportApp` | Whether production source may import `@/` |

A package that exists on disk but is missing from the registry fails the check.
A registry entry that points at a missing folder fails the check.
Wildcard `exports` (`./*`) fail the check.

### Derived vendor list

`OWNED_VENDOR_MODULES` is **derived** from every package's `vendorModules`. There is no
parallel hand-maintained list — a vendor present only in a hardcoded array would be
unenforceable against its real owner, and a vendor present only on a package would be
invisible to the ownership scan.

Dual ownership is intentional where two capabilities share one SDK for distinct jobs
(for example `@aws-sdk/client-s3` for product media vs OTA artifacts, and
`google-auth-library` for FCM HTTP v1 vs Google Play). Both owners must remain registered.
`firebase-admin` is **not** a production path and is not registered as an owner SDK.

### Root vendor-owned files

Some repository-root files are not under `packages/<owner>/` but still belong to a
capability for vendor-import purposes. They are listed in `ROOT_VENDOR_OWNED_FILES`
(currently `capacitor.config.ts` → `native-core`) and are scanned by the runner.

## Mandatory gateways (examples)

| Capability | Owner | Forbidden bypass |
| :--- | :--- | :--- |
| Database / SQL / Turso / SQLite | `@asol/data-core` | Direct `better-sqlite3`, `@libsql/client`, `drizzle-orm` (including via `nodeRequire` / `createRequire`) |
| Object storage (R2/S3) | `@asol/storage-core` | Direct `@aws-sdk/client-s3` outside owned adapters |
| Push delivery | `@asol/notifications-core` | Direct `web-push` / `google-auth-library` outside that package (and ota-core for Play) |
| OTA + Google Play auth client | `@asol/ota-core` | Direct `google-auth-library` / S3 SDK in app modules |
| Native / Capacitor | `@asol/native-core` | Direct `@capacitor/*` (and related) outside native-core — including other packages' tests |
| Page-authored persistence | `@asol/page-save-core` | Deep imports or writes outside the registered surface |
| Branding icons | `@asol/branding-core` | Ad-hoc icon generators outside the package |

## Vendor ownership and tests

Vendor SDKs may be imported only by their owning package(s). **Tests are not exempt**
unless the test file itself lives under an owning package. A foreign package's tests
constructing `better-sqlite3` (or any other owned SDK) is treated as the same bypass
as production code. Prefer `node:sqlite` or a port/fake when a non-owner package needs
an in-memory database in tests.

`extractImports` is statement-boundary aware and also resolves `nodeRequire(...)` and
`createRequire(...)("pkg")`, so lazy driver loading cannot hide a vendor import inside
a string fixture or an alias require.

## No circular package dependencies

`checkPackageCycleContract` builds the package import graph from production sources
under `packages/*/src` (tests excluded — a package's tests may reach for another
package's fixtures, and that never ships) and rejects any cycle.

**`import type` edges count.** They are erased at runtime, so a type cycle carries no
module-loading hazard, but two packages joined by one still cannot be reasoned about,
extracted, or tested apart, and they are one refactor away from the edge carrying a
value.

Two cycles existed before this check and would have passed unnoticed:

| Cycle | Broken by |
| --- | --- |
| `notifications-core ⇄ data-core` | `NotificationTokenStorePort` — delivery names three persistence operations; the application and the notifications deployment each wire data-core's queries at their composition root |
| `data-core ⇄ ota-core` | `OtaReleaseSummary` and `OtaReleaseAuditEntry` are row projections, so they moved to data-core; ota-core re-exports them, keeping one definition and an unchanged public surface |

When a cycle appears, invert one edge — name a port in the package that needs the
capability and wire the implementation in a composition root — or move the shared type
down to the package that owns the data. Do not add an exception.

## Page-save write surface

`checkPageSaveGatewayContract` freezes the write-surface `skippedDirectories` set to
exactly `node_modules`, `tests`, `__tests__`, `api`.

`api` is excluded because HTTP route handlers persist through domain/data owners, not
through page-save. Expanding that set is an architectural decision and must update this
document in the same change.

## Composition root

Application wiring lives in `src/core/composition/` (and account `*-composition` packages).
Capability packages declare ports; composition registers implementations. Capability packages
must not import `@/`.

## Enforcement layers

1. Package `exports` maps (no deep doors).
2. ESLint `no-restricted-imports` (vendors + deep `@asol/*/src/**`, including Capacitor
   bans in packages other than `native-core`).

   The ESLint vendor list is the editor-time echo of the capability registry, and the
   two must name the same owners. It has to `ignores` the owning folders — a rule that
   fires inside the package that owns the SDK is not enforcement, it is a broken build.
   Bare vendor names belong in `paths`, not `patterns`: as a pattern, `web-push` also
   matched the relative import `../infrastructure/web-push/web-push-browser.service`
   and flagged a module for importing its own adapter.
3. `npm run architecture:check` — registry ownership, package seal, vendor ownership
   (including tests and root owned files), package↔app import boundary, package cycles,
   page-save gateway, plus existing layer contracts.
4. Per-package `test:*-core` gates (including page-save ownership / write-surface).

## Adding a package

1. Create `packages/<name>` with an explicit `exports` map.
2. Register it in `capability-registry.ts` with layer, ownership statement, and vendors.
3. Keep `mayImportApp: true` only for `*-composition` packages.
4. Run `npm run architecture:check` and the package's `test:*-core`.

## Ports are only inverted if they resolve lazily

A port read at module scope puts import order back into the contract: importing the
file, not calling it, decides whether the process survives. `specialty-columns.server.ts`
resolved the category-catalog port while the module evaluated, so
`products-composition` — which never registers that port — died on
`categoryCatalog.getSpecialtyColumnItems is not configured` the moment anything pulled
the file in.

Resolve inside the function that needs the value, memoise if the work is expensive, and
expose a reset for tests.

The static release build had no composition root at all. `@asol/ota-core` audits the
generated `out/` tree against the category registry through a port, and nothing
registered it on that path, so `build:static` died on
`otaCorePort: categories is not configured` after a successful `next build`.
`scripts/build-static.ts` is now that root — an application-side entry that wires the
port and hands off to `@asol/ota-core/publishing`. The audit stays in ota-core and the
category logic stays in the feature that owns it; neither is reimplemented.

The same rule has a second half: anything that drives a composed service outside the
running application has to compose it. `registerAppServerPorts()` runs from
`src/instrumentation.ts` at server startup, so a test importing a service directly gets
an unconfigured port. Three notification tests and the follow test now call
`registerNotificationsCorePorts()` themselves, exactly as the follow test already did
for the session signing secret.

## The page-save gateway is mandatory

`checkPageSaveWriteGatewayContract` reads the syntax tree of every `.tsx` file and
every `.ts` under `presentation/`, and follows calls *within the module*: a mutating
`asolApi` call is legal only when every path that reaches it starts at a staged
executor (`stage({ execute })`) or a registration's `save` handler.

Following calls is the point. `CustomRequestPageContent` hands `submitRequest` to
`save:` and the `asolApi.post` sits in another function — lexical nesting alone reports
that as a violation. Text matching does worse: the previous write-surface test
allowlisted *named service calls*, so a page calling `asolApi.post` directly was
invisible to it, and a probe reproducing that bypass passed every gate.

### The read marker

A POST that computes and returns something, persisting nothing — a plan, a validation,
an inspection, a diff — is not a write, and the HTTP verb cannot say so. The call site
does, and states why:

```ts
// page-save-read: computes a cleanup plan for review, persists nothing
const plan = await asolApi.post<Plan>(DATA_HEALTH_API.plan, body, { headers });
```

Per call, reason-bearing, rejected when the reason is missing. It cannot be applied to
a file or a directory, and it sits at the exact line it excuses.

### Capabilities that own their own writes

`NON_PAGE_SAVE_CAPABILITIES` lists the few files whose writes belong to another
capability — cart checkout, order lifecycle transitions, session impersonation — each
with a stated reason. This mirrors the exclusions the policy already names; page-save
does not take over another package's responsibility.

### Three bugs this check had before it worked

Worth recording, because each one made it silently permissive:

1. Functions were keyed by name, so a module's several `execute:` arrows overwrote each
   other and a staged write looked unreachable from any gateway.
2. Scope was `presentation/` and `components/` by folder, so a component placed
   anywhere else was never scanned — the probe written to reproduce the original bypass
   sailed straight through the check meant to catch it.
3. `typescript` was briefly declared an owned vendor of `architecture-core`, which
   immediately failed the refactor codemods that use the same parser. A compiler is
   toolchain, not infrastructure: it grants access to no capability, so it is allowed
   by name in that package's own contract test and owned by nobody.

## Superseded gap note: the page-save gateway is not yet mandatory

`checkPageSaveGatewayContract` verifies the package exists, exposes a single door, keeps
its two enforcement tests, and is not deep-imported. It does **not** verify that
presentation code performs no write outside the gateway; it defers that to
`page-save-write-surface.test.ts`, which matches an allowlist of named service calls
(`productApiService.create`, …) and is therefore blind to a raw `asolApi.post(...)`.

A page can still write directly and pass both `architecture:check` and
`test:page-save-core`. `src/modules/dev-cloud-backup/presentation/use-dev-cloud-backup-page.ts`
does exactly that today — a POST on tap, plus its own notice and error messages, both
forbidden by the page-save policy.

Closing this needs an AST rule that requires every mutating `asolApi` call in a
presentation module to sit inside a staged executor or a `save()` handler, and the
migration of the surfaces that currently do not. That migration changes how those admin
pages behave, so it is a deliberate change rather than a silent one.

## Ports change what old text-matching guards see

Inverting a dependency introduces something that did not exist before: an
*unconfigured default*. `account-bridge`'s `UNCONFIGURED_ENV` ships
`apiBaseUrl: ''` as the value the application replaces at bootstrap.

`auditStaticApiBaseUrl` grepped every static chunk for `apiBaseUrl: ""` and failed on
the first hit. After the inversion it could no longer tell "nothing was baked" from
"a port declares a default", and it failed a build whose bundle correctly carried
`apiBaseUrl:"https://gova-swart.vercel.app"`.

The audit now keeps the invariant that matters — the bundle must carry a real absolute
URL — and treats an empty literal as a failure only when nothing baked a real one.

When a refactor adds ports, re-read the guards that match on source text. They were
written against a codebase that had no defaults to confuse them.

## Independent verification pass

A second, adversarial pass built ten bypasses and ran them against the repository
rather than reading the rules. Nine were rejected: a direct database client, a storage
SDK, a deep import of a repository, a native API, a relative path into `packages/`, an
owned vendor, a dynamic `import()`, a `createRequire` load, and a type-only deep import.

The tenth was not.

```ts
export * from "@asol/data-core/src/core/database/turso-db-client";
```

`extractImports` — the function every architecture check is built on: vendor ownership,
the package seal, package cycles, the package/app boundary — read `import`, `require`,
`nodeRequire`, `createRequire` and dynamic `import()`, and did not read re-exports. That
is the most useful shape for hiding a forbidden dependency: one module republishes a
package's internals, and everything downstream reaches them through a local path that
looks legal. One fix closed it in every check at once.

Two things this pass also confirmed, by measurement rather than by reading:

- **Infrastructure ownership is genuinely narrow.** `better-sqlite3`, `@libsql/client`
  and `drizzle-orm` have exactly one consuming package each (`data-core`);
  `@aws-sdk/client-s3` has two; `web-push` has one. All declared in the registry.
- **The graph is acyclic**, with one layer inversion — `architecture-core` reads
  `@asol/ota-core/publishing` for the native-surface report, through a declared door,
  named in that package's own contract test.

### Scanning a file that contains the rule

Twice now a guard has failed on its own text: the touch-policy test spelled `hover:` out
in full, and the re-export doc comment above spelled the syntax it matches. A check whose
source is inside its own scan has to describe its pattern without writing it.

### Reported, not changed

`data-core` has thirteen outgoing package edges (ninety-five references to `orders-core`
alone). A persistence package depending on thirteen domain packages reads as
infrastructure leaking upward, but it creates no cycle — those packages do not import it
back — and it is the repository's deliberate shape: repositories typed by the domain
contracts whose rows they store. Inverting it would move types across thirteen packages
and close no bypass.

## Default-deny: enforcement covers the repository, not four folders

The runner walks `src`, `packages`, `scripts` and `services`. An adversarial pass put
`import Database from "better-sqlite3"` in four places: three were rejected, and the one
in a new top-level directory drew no complaint at all. A boundary a developer escapes by
choosing a different folder name is not a boundary — that is default-allow.

`checkRepositorySweepContract` runs the two rules that must hold regardless of where code
lives — which package may touch an infrastructure SDK, and that package internals are
unreachable — over the whole tree, including files at the repository root.

Layer contracts stay on their roots. They classify a file by its architectural position
(UI, hook, service, repository), and a path outside the application has no such position.
Infrastructure ownership is different: it is about what a file may *touch*, which is true
everywhere.

Exclusions are content that is not repository source — build output, the Capacitor store
shells, docs, public assets, gitignored local state — each excluded for what it is rather
than for being inconvenient.

### What the sweep found immediately

```
capacitor.config.ts reaches into packages/native-core by relative path
  "./packages/native-core/package.json"
```

The config derived Capacitor's `includePlugins` allowlist by reading the package's own
manifest. The intent was right — one source of truth, so adding a plugin needs no second
edit — but the route was a relative traversal the package seal forbids everywhere else,
and it survived only because root files were never scanned.

Fixed structurally, not by exception: `@asol/native-core` owns the derivation and exports
`CAPACITOR_INCLUDE_PLUGINS`, because the knowledge of which plugins exist belongs to the
package that declares them. `capacitor.config.ts` imports it through the door.

`release-commands` had pinned the old mechanism by asserting the config contained the
literal `native-core/package.json` — a guard holding the shape rather than the invariant,
and so an obstacle to fixing it. Its stated intent ("the two lists cannot drift") now has
three assertions that follow the architecture: the list arrives through the package door,
the relative path must not return, and native-core derives it from its own dependencies.

## Import without composition

`npm run test:import-without-composition` imports every declared door in a bare process
where nothing has been configured, and requires that the import itself does not throw.

Six of the eight breaks in the enforcement refactor were one shape: a dependency
correctly inverted into a port, and a place that resolves it left unwired. Neither
`typecheck` nor `architecture:check` sees that — both stayed green throughout — because
the failure is a runtime throw, sometimes only on a build machine, after the deployment
commit is already on GitHub.

This turns the rule the docs state into a check: a port is only inverted if it is also
resolved lazily. A door may still throw when a *function* is called without
configuration; that is correct, and is why the child process only imports.

Two classifications keep it honest rather than lenient:

- A door whose entry is `server-only` is imported under `--conditions=react-server`, and
  one that turns out to be server-only transitively is retried there when Node reports
  exactly that mismatch. Both are real load modes for this repository.
- A failure matching `Unknown file extension` is a missing Node loader, not an
  architectural fault — `@asol/map-core` reaches a stylesheet through `maplibre-gl`.
  Classified from the failure, because the import that cannot load is usually several
  modules deep.

Verified by reintroducing the original break: resolving the category-catalog port at
module scope in `specialty-columns.server.ts` fails the check with the same message that
took down `products-composition`.

### What it does not cover

Module-instance duplication. A narrowing of the `@asol/data-core/core` door moved
thirty-nine internal imports from the barrel to a direct path; ports in that package are
singletons per module instance, and under Next's bundler the two specifiers produced two
instances, so `instrumentation.ts` configured one while repositories read the other.
Every static check and the full suite stayed green — `tsx` resolves one path to one
instance — and production returned `getServerRuntimeContext is not configured` on every
server route until the change was reverted.

The lesson is narrower than "be careful": **do not change how internal modules reach a
module that holds singleton state.** Narrow a public door by adding a new narrow door and
moving its one consumer, leaving internal import paths untouched.
