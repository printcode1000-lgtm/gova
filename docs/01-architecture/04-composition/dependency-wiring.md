# Dependency Wiring

## Purpose

Practical guide for wiring a capability port from package declaration through application adapter to composition root registration.

## Scope

Port wiring pattern in the main application. Composition packages follow the same inversion pattern at account scope.

## Wiring workflow

### 1. Package defines port

In `packages/<name>-core/src/ports/`:

```typescript
export interface MyFeaturePort {
  resolveConfig(): MyConfig;
}

let port: MyFeaturePort = { resolveConfig: () => DEFAULT };

export function configureMyFeatureCore(next: Partial<MyFeaturePort>): void {
  port = { ...port, ...next };
}

export function getMyFeaturePort(): MyFeaturePort {
  return port;
}
```

### 2. Application implements adapter

Single file under `src/features/<feature>/`:

```typescript
// my-feature-core-ports.ts
import { configureMyFeatureCore } from '@asol/my-feature-core';

export function registerMyFeatureCorePorts(): void {
  configureMyFeatureCore({
    resolveConfig: () => readFromAppConfig(),
  });
}
```

This file is the **only** place that imports both `@/` and `@asol/my-feature-core` port types.

### 3. Register at composition root

Add to `browser-ports.ts` and/or `server-ports.ts`:

```typescript
registerMyFeatureCorePorts();
```

### 4. Update ports-registry test

Add the registration to the expected list in `src/core/composition/tests/ports-registry.test.ts`.

### 5. Verify

```bash
npm run test:my-feature-core
npm run architecture:check
```

## Existing wiring map

| Capability | Wiring module(s) | Root(s) |
|---|---|---|
| `@asol/data-core` | `data-core-ports.ts`, `data-core-browser-ports.ts` | server, browser |
| `@asol/storage-core` | `storage-core-ports.ts` | server |
| `@asol/orders-core` | `orders-core-ports.ts` | server |
| `@asol/notifications-core` | `notifications-core-ports.ts` | server |
| `@asol/ota-core` | `ota-core-ports.ts`, `server.ts` | browser, server |
| `@asol/page-save-core` | `page-save-core-bootstrap.ts` | browser |
| `@asol/page-snapshot-core` | `page-snapshot-service.ts` | browser |
| `@asol/system-logs-core` | `system-logs-core-bootstrap*.ts` | browser, server |
| `@asol/account-bridge` | `account-bridge-ports.ts` | browser |
| `@asol/observability-core` | inline in composition roots | browser, server |

## Dynamic import on server

`server-ports.ts` uses `await import(...)` for each registration to keep route module graphs minimal. Follow this pattern for new server ports.

## Source Map

- Wiring modules: `src/features/**/*-ports.ts`, `*-bootstrap*.ts`
- Composition roots: `src/core/composition/`
- Test: `src/core/composition/tests/ports-registry.test.ts`

## Related Documents

- [Composition Roots](./composition-roots.md)
- [Ports and Contracts](../03-dependencies/ports-and-contracts.md)

## Change Impact

Duplicate wiring modules for the same port create drift — consolidate before adding features.

## Invariants

1. One wiring module per port family.
2. Capability packages never import wiring modules.
3. Ports-registry test MUST stay green.
