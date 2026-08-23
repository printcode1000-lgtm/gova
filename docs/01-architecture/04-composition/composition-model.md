# Composition Model

## Purpose

Describe how capability packages are wired into runnable runtimes through composition roots — without capability packages importing application code.

## Scope

Composition architecture for the main Next.js app and six service deployments. Deployment operations: [docs/07-mobile-and-release/](../../07-mobile-and-release/).

## Two composition contexts

| Context | Where | What gets wired |
|---|---|---|
| **Main application** | `src/core/composition/` | All browser + server ports for full app |
| **Service accounts** | `packages/*-composition/` + `services/*/` | Subset per Vercel account |

## Composition packages (6)

Each has `mayImportApp: true` and `layer: 'composition'`:

| Package | Service folder | Account declaration door |
|---|---|---|
| `@asol/notifications-composition` | `services/notifications/` | `@asol/account-declarations/notifications` |
| `@asol/orders-composition` | `services/orders/` | `@asol/account-declarations/orders` |
| `@asol/products-composition` | `services/products/` | `@asol/account-declarations/products` |
| `@asol/profiles-composition` | `services/profiles/` | `@asol/account-declarations/profiles` |
| `@asol/submain-composition` | `services/submain/` | `@asol/account-declarations/submain` |
| `@asol/sub2main-composition` | `services/sub2main/` | `@asol/account-declarations/sub2main` |

Compositions build a **runtime object** grouped by task (`database`, `images`, `catalog`, `crypto`, `config`, …). Absent keys mean the account lacks that credential — not a runtime error from calling forbidden APIs.

## Main app composition

The main app is not a `*-composition` package. It uses:

- `src/core/composition/browser-ports.ts` — client-side port registration
- `src/core/composition/server-ports.ts` — server-side port registration (from `instrumentation.ts`)

Individual routes SHOULD NOT import composition roots to pull unrelated ports — registration happens once globally; routes import only the capability doors they need.

## Design constraints

1. **Capability packages stay pure** — no `@/` imports (`mayImportApp: false`).
2. **One wiring module per port family** in `src/features/**/`.
3. **Declarations stay data-only** — compositions import `@asol/account-declarations/<account>`, never the barrel.
4. **Service mirrors are import-graph copies** — `@asol/service-mirror-core` syncs sealed sources into `services/*/generated/`. Invisible imports are omitted silently.

## Source Map

- Browser root: `src/core/composition/browser-ports.ts`
- Server root: `src/core/composition/server-ports.ts`
- Registry composition entries: `capability-registry.ts`
- Mirror sync: `@asol/service-mirror-core`, `npm run services:sync`

## Related Documents

- [Composition Roots](./composition-roots.md)
- [Dependency Wiring](./dependency-wiring.md)
- [Service Composition](./service-composition.md)

## Change Impact

New service account requires: declaration door, composition package, service project, cloud account UI entry, capability-closure tests.

## Invariants

1. Exactly six composition packages — all with `mayImportApp: true`.
2. Compositions MUST NOT import `account-declarations` barrel.
3. Capability packages MUST NOT import compositions.
