# Dependency Rules

## Purpose

Repository-wide rules governing which code may depend on which. Agents use this with [allowed-dependencies.md](./allowed-dependencies.md) and [forbidden-dependencies.md](./forbidden-dependencies.md) before adding imports.

## Scope

Dependencies between `@asol/*` packages, application layers, and vendor SDKs. Exact inter-package edges: [dependency-map.md](../08-reference/dependency-map.md).

## Core rules

1. **Downward only in the application stack** — UI never imports repository or database layers. See [layer-stack.md](../10-application-layers/layer-stack.md).

2. **Doors only between packages** — `@asol/*` imports MUST resolve to a declared `exports` key. No deep paths, no relative traversal into `packages/`.

3. **Vendor SDKs through owners** — If a module appears in `vendorModules` for package A, only A (and scan-approved dual owners) may import it.

4. **Composition is the app edge for deployments** — `*-composition` packages MAY import `@/`; capability packages MUST NOT.

5. **Declarations import nothing** — `@asol/account-declarations` is pure data; any import fails its contract test.

6. **No new cycles** — `checkPackageCycleContract` rejects circular `@asol/*` dependencies. `checkApplicationCycleContract` automatically discovers every cluster under `src/features/*`, `src/shared/*`, and `src/core/*`, including static imports, dynamic imports, and re-exports. Three pre-existing strongly connected components are frozen in `KNOWN_APPLICATION_CYCLE_BASELINE`, together with the exact audited list of every edge participating inside them; a new component, an internal cyclic edge, a component that gains members, or a stale baseline entry fails `architecture:check`. The baseline is recorded audit debt, not permission to add edges.

7. **Pinned application edges** — `@asol/data-core` has a budget of application import sites (designated wiring modules). New edges require explicit approval and contract updates.

## Dependency direction summary

```text
Application (src/)
    ↓ imports doors only
Capability packages (@asol/*-core)
    ↓ may import other @asol/* doors
Vendor SDKs (owned modules only)

Composition packages
    ↓ may import @/features + @asol/* + account-declarations/<account>

account-declarations
    ↓ imports nothing
```

## Runtime-aware dependencies

| Context | Rule |
|---|---|
| Browser client components | No `server-only`, no Node builtins, no `./server` doors unless build excludes them |
| Server routes / services | May use `./server` doors; MUST NOT pull client-only UI |
| Scripts | Database drivers forbidden — use `@asol/data-core` tooling doors |
| Service mirrors | Import graph determines synced files — invisible imports are silently omitted |

Detail: [browser-server-boundaries.md](../06-runtime-boundaries/browser-server-boundaries.md).

## Source Map

- Cycle check: `packages/architecture-core/src/checks/package-cycle-contract.ts`
- App import check: `packages/architecture-core/src/checks/package-app-import-contract.ts`
- Vendor check: `packages/architecture-core/src/checks/vendor-ownership-contract.ts`
- Layer matrix: `packages/architecture-core/src/contracts/contract.ts`

## Related Documents

- [Dependency Inversion](./dependency-inversion.md)
- [Ports and Contracts](./ports-and-contracts.md)
- [Module Isolation Rules](../02-packages/module-isolation-rules.md)

## Change Impact

New `@asol/*` edges require dependency-map update, cycle check pass, and possibly capability-closure test updates for compositions.

## Invariants

1. Capability packages do not import `@/`.
2. Vendor imports match registry ownership.
3. Application layer shortcuts fail architecture scan and ESLint.
