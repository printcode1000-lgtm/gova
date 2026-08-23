# Composition Roots

## Purpose

Document the two primary composition roots that register all application-side port implementations for the main Next.js application.

## Scope

`src/core/composition/browser-ports.ts` and `src/core/composition/server-ports.ts`. Service-specific roots live in `*-composition` packages — see [service-composition.md](./service-composition.md).

## Browser composition root

**File:** `src/core/composition/browser-ports.ts`  
**Entry:** `registerBrowserPorts()` — idempotent, `'use client'`

Registers:

| Registration | Source module |
|---|---|
| `configureObservabilityCore` | `@/core/config` (isDevelopment) |
| `registerOtaCorePorts` | `@/features/ota/ota-core-ports` |
| `registerAccountBridgePorts` | `@/features/account-bridge/account-bridge-ports` |
| `registerDataCoreBrowserPorts` | `@/features/data/data-core-browser-ports` |
| `registerPageSaveCorePorts` | `@/features/page-save/page-save-core-bootstrap` |
| `registerPageSnapshotCorePorts` | `@/features/page-snapshot/services/page-snapshot-service` |
| `registerSystemLogsCoreBrowserPorts` | `@/features/system-logs/system-logs-core-bootstrap` |

**Why one entry point:** Scattered registration caused OTA ports to stay at defaults until a late-mounted component ran — safe defaults hid the bug. Central registration makes "which seams exist" a single fact.

**Test gate:** `src/core/composition/tests/ports-registry.test.ts` asserts every browser seam is called from here.

## Server composition root

**File:** `src/core/composition/server-ports.ts`  
**Entry:** `registerAppServerPorts()` — async, `import 'server-only'`  
**Called from:** `src/instrumentation.ts` before first request

Registration order (abbreviated):

1. `ensureStorageProfilesValidated()` — `@asol/storage-core/server`
2. `configureObservabilityCore` + monitor telemetry (browser + server)
3. `registerOrdersCorePorts` — super-admin identity
4. `registerSystemLogsCoreServerPorts`
5. `registerOtaCoreServerPorts`
6. `registerNotificationsCorePorts`
7. `registerStorageCorePorts`
8. `registerDataCorePorts`

Uses **dynamic import** so a route needing one seam does not drag the entire graph into its module — critical for service mirror import walking.

**Test gate:** same `ports-registry.test.ts` for server seams.

## Agent rules

| Do | Don't |
|---|---|
| Add new port registration to the appropriate root | Register ports from random feature components |
| Update `ports-registry.test.ts` when adding a seam | Import `registerAppServerPorts` from route handlers |
| Keep wiring logic in `src/features/**/` | Put application imports inside capability packages |

## Source Map

- `src/core/composition/browser-ports.ts`
- `src/core/composition/server-ports.ts`
- `src/instrumentation.ts`
- `src/core/composition/tests/ports-registry.test.ts`

## Related Documents

- [Dependency Wiring](./dependency-wiring.md)
- [Ports and Contracts](../03-dependencies/ports-and-contracts.md)

## Change Impact

Missing registration → safe defaults → hidden bugs. Always update ports-registry test in the same change.

## Invariants

1. `registerBrowserPorts()` is idempotent.
2. Every package port used in `src/` MUST be registered from one of the two roots.
3. Server root is not a barrel for routes to import.
