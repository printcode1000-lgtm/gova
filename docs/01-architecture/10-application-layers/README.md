# Application Layers

## Purpose

Index for the enforced application layer stack from UI through database client. Agents MUST follow layer direction when adding or modifying features under `src/`.

## Scope

Application code in `src/` — not sealed packages (see [02-packages/](../02-packages/)). Database operational detail: [docs/02-data-and-storage/](../../02-data-and-storage/).

## Official stack

```text
UI → Hooks → Client Services → AsolApiClient → Business API
  → Server Services → Query/Command → Repository → Database Client → SQLite / Turso
```

No shortcut paths. Architecture scan and ESLint enforce the matrix in `packages/architecture-core/src/contracts/contract.ts`.

## Layer documents

| Layer | Document |
|---|---|
| Stack overview | [layer-stack.md](./layer-stack.md) |
| UI | [ui-layer.md](./ui-layer.md) |
| Hooks | [hooks-layer.md](./hooks-layer.md) |
| Client services | [client-service-layer.md](./client-service-layer.md) |
| API client | [api-client-layer.md](./api-client-layer.md) |
| Business API | [business-api-layer.md](./business-api-layer.md) |
| Server services | [server-service-layer.md](./server-service-layer.md) |
| Operations (query/command) | [operations-layer.md](./operations-layer.md) |
| Repository | [repository-layer.md](./repository-layer.md) |
| Database client | [database-client-layer.md](./database-client-layer.md) |

## Package boundary

Application layers call `@asol/*` through declared doors. They MUST NOT import vendor SDKs owned by packages. Page-authored writes MUST use `@asol/page-save-core`.

## Configuration

`process.env` reads belong in `src/core/config/*` only — not scattered in features.

## Verification

```bash
npm run architecture:check
npm run lint
npm run build
```

Backup reference: `docs/01-architecture-backup/data-layers/19-architecture-contract.md`.

## Related Documents

- [Module Isolation Rules](../02-packages/module-isolation-rules.md)
- [Mandatory Gateways](../05-capability-enforcement/mandatory-gateways.md)
- [Application–Package Boundaries](../06-runtime-boundaries/application-package-boundaries.md)

## Change Impact

Layer violations fail build. New features need layer placement decided before implementation.

## Invariants

1. UI never imports repository or database layers.
2. Client code never imports `server-only` modules.
3. All layers participate in architecture scan.
