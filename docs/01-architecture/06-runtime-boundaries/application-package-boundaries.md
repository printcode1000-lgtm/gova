# Application–Package Boundaries

## Purpose

Define the boundary between application code (`src/`, `scripts/` coordination) and sealed packages (`packages/`).

## Scope

Import direction, port wiring, and forbidden cross-boundary patterns.

## Boundary diagram

```text
┌──────────────────────────────────────────────┐
│  Application (src/)                          │
│  UI · hooks · routes · feature wiring        │
│         │ imports doors only                 │
│         ▼                                    │
│  ┌────────────────────────────────────┐      │
│  │  Sealed @asol/* packages           │      │
│  │  capability · composition · …      │      │
│  └────────────────────────────────────┘      │
│         ▲                                    │
│         │ ports implemented by               │
│  src/features/**/*-ports.ts (wiring only)    │
└──────────────────────────────────────────────┘
```

## Allowed crossing points

| Direction | Mechanism | Example |
|---|---|---|
| App → package | Declared export door | `import from '@asol/product-core/server'` |
| Package → app | **Forbidden** (capability) | — |
| Package → app | Composition only | `orders-composition` imports `@/features/orders/...` |
| App → package ports | Wiring module registers impl | `registerDataCorePorts()` |
| Scripts → package | Tooling doors | `@asol/data-core/tooling`, `@asol/ota-core/publishing` |

## Forbidden crossings

- Relative import from `src/` into `packages/*/src/**`
- Capability package importing `@/components`, `@/features`, `@/core`
- UI component importing `@asol/data-core` repository internals via deep path
- Feature bypassing `@asol/page-save-core` for page writes

## Designated app edges to data-core

`@asol/data-core` allows a **pinned budget** of application import sites for row contracts and wiring — not a blanket `@/` import from the package side. New edges require explicit approval. Follow-up consolidation reduced budget from 30 to 25 (ADR-0002).

## Scripts boundary

Scripts coordinate builds and deploys. Database drivers and SQL in `scripts/` fail architecture check. Executable DB logic belongs in `@asol/data-core` tooling/provisioning doors.

## Services boundary

`services/*/` are mini-applications — they import composition packages and mirrored sealed code, not arbitrary `src/` paths unless synced through the import graph.

## Source Map

- App import check: `checks/package-app-import-contract.ts`
- Seal check: `checks/package-seal-contract.ts`
- Wiring: `src/features/**/*-ports.ts`

## Related Documents

- [Module Isolation Rules](../02-packages/module-isolation-rules.md)
- [Ports and Contracts](../03-dependencies/ports-and-contracts.md)
- [Application Layers](../10-application-layers/README.md)

## Change Impact

Blurring the boundary (e.g. moving React into packages) violates rule 7 and fails composition closure.

## Invariants

1. Capability packages never import `@/` (`mayImportApp: false`).
2. Only composition packages have `mayImportApp: true`.
3. Application uses doors, not internals.
