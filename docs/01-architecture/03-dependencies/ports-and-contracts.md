# Ports and Contracts

## Purpose

Define how capability packages declare **ports** (required interfaces) and **contracts** (shared types/APIs), and where adapters register implementations.

## Scope

Port/contract patterns across sealed packages and application wiring. Notification-specific contract: `packages/architecture-core/src/contracts/notification-contract.ts`.

## Concepts

| Term | Definition |
|---|---|
| **Port** | Interface a capability requires from the environment (identity, HTTP, storage adapter, build ID) |
| **Contract** | Narrow shared types between packages — least authority |
| **Adapter** | Application code implementing a port |
| **Registration** | Calling `register*Ports()` or `configure*Core()` at composition root |

## Port declaration (inside package)

Capability packages define ports in dedicated files — never import application types:

```typescript
// packages/example-core/src/ports/identity-port.ts
export interface ExampleIdentityPort {
  getCurrentUserId(): string | null;
}
```

Default implementations are no-ops or fail-closed so missed registration is visible in dev, not catastrophic in prod.

## Port wiring (application only)

Exactly **one wiring module per port family** under `src/features/**/`:

| Package | Wiring module |
|---|---|
| `@asol/data-core` | `src/features/data/data-core-ports.ts`, `data-core-browser-ports.ts` |
| `@asol/storage-core` | `src/features/storage/storage-core-ports.ts` |
| `@asol/orders-core` | `src/features/orders/orders-core-ports.ts` |
| `@asol/notifications-core` | `src/features/notifications/notifications-core-ports.ts` |
| `@asol/ota-core` | `src/features/ota/ota-core-ports.ts`, `src/features/ota/server.ts` |
| `@asol/page-save-core` | `src/features/page-save/page-save-core-bootstrap.ts` |
| `@asol/page-snapshot-core` | `src/features/page-snapshot/services/page-snapshot-service.ts` |
| `@asol/system-logs-core` | `src/features/system-logs/system-logs-core-bootstrap*.ts` |
| `@asol/account-bridge` | `src/features/account-bridge/account-bridge-ports.ts` |

Wiring modules are the **only** files allowed to know both package port types and application implementations. Cast at the boundary with a comment explaining why.

## Composition roots

All browser ports register from one entry:

```typescript
// src/core/composition/browser-ports.ts
registerBrowserPorts(); // idempotent
```

Server ports register once from `src/instrumentation.ts` via `registerAppServerPorts()`.

`src/core/composition/tests/ports-registry.test.ts` lists every required registration — omissions fail the test.

## Architecture contracts (enforcement data)

| Contract file | Role |
|---|---|
| `packages/architecture-core/src/contracts/contract.ts` | Layer definitions, import matrix, path normalization |
| `packages/architecture-core/src/contracts/notification-contract.ts` | Notification module boundaries |
| `packages/architecture-core/src/contracts/image-storage-contract.ts` | Image storage write paths |

These are data consumed by scan checks — not runtime imports for features.

## Contracts between packages

Prefer importing another package's **door** over duplicating types:

- `@asol/signed-token-core` — shared signing envelope for `auth-core`, `notifications-core`
- `@asol/format-core` — shared locale formatting (zero dependencies)
- Domain entity doors — e.g. `@asol/data-core/product/entities` for row shapes

## Source Map

- Browser root: `src/core/composition/browser-ports.ts`
- Server root: `src/core/composition/server-ports.ts`
- Ports registry test: `src/core/composition/tests/ports-registry.test.ts`
- Contracts: `packages/architecture-core/src/contracts/`

## Related Documents

- [Composition Roots](../04-composition/composition-roots.md)
- [Dependency Wiring](../04-composition/dependency-wiring.md)
- [Dependency Inversion](./dependency-inversion.md)

## Change Impact

New ports require: package port type, wiring module, composition root registration, ports-registry test update, and docs if the capability boundary changed.

## Invariants

1. Packages MUST NOT import `@/` to obtain port implementations.
2. Every port has exactly one wiring module in `src/features/`.
3. Composition roots MUST register every browser/server seam listed in ports-registry test.
