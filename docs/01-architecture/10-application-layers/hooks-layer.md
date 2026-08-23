# Hooks Layer

## Purpose

Rules for React hooks that bridge UI and client services.

## Scope

Hooks under `src/features/**/hooks/`, feature hooks, and colocated `use*.ts` files.

## Responsibilities

- Compose client service calls
- Manage local UI state and effects
- Expose stable API to components

## May import

- Client services (same feature or shared)
- Browser-safe utilities and `@asol/*` client doors
- Other hooks (avoid deep chains)

## Must never import

- Repository or operations layer
- Database client, Drizzle, drivers
- Server services
- `server-only` modules

## Pattern

```text
Component → useFeatureHook() → featureClientService → AsolApiClient
```

Business logic belonging to a sealed capability should live in the `@asol/*-core` package; hooks orchestrate calls, not domain rules.

## Source Map

- `src/features/**/hooks/`, feature hooks (15 hook directories)
- Classifier: `packages/architecture-core/src/contracts/contract.ts`

## Related Documents

- [UI Layer](./ui-layer.md)
- [Client Service Layer](./client-service-layer.md)

## Change Impact

Hooks reaching DB require refactor to client service + API path.

## Invariants

Hooks run in client bundle — no Node APIs.
