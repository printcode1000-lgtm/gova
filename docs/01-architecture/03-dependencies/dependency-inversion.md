# Dependency Inversion

## Purpose

Explain how the repository applies dependency inversion: high-level capability packages define interfaces; low-level application and infrastructure details implement them at composition boundaries.

## Scope

Inversion pattern between `@asol/*` capability packages and `src/` application code. Not a general DI framework guide — the repo uses explicit port registration, not a container.

## Pattern

```text
┌─────────────────────────────┐
│  @asol/orders-core          │  defines OrderIdentityPort
│  (domain + policies)        │
└──────────────┬──────────────┘
               │ depends on abstraction
               ▼
┌─────────────────────────────┐
│  src/features/orders/       │  implements port using session/auth
│  orders-core-ports.ts       │
└──────────────┬──────────────┘
               │ registered at
               ▼
┌─────────────────────────────┐
│  src/core/composition/      │  registerOrdersCorePorts()
│  server-ports.ts            │
└─────────────────────────────┘
```

Capability modules **never** import concrete auth, HTTP, or database construction from `src/`. They call port getters that default safely until registration.

## Why inversion here

1. **Seal integrity** — Packages stay independent (`mayImportApp: false`).
2. **Service mirrors** — Each `services/*` deployment imports a subset of capabilities; ports let compositions supply only what that account holds credentials for.
3. **Testability** — Contract tests mock ports without spinning up Next.js.
4. **Rule 9** — Infrastructure upgrades stay inside owners; consumers see stable port APIs.

## Inversion vs composition packages

| Layer | Inversion role |
|---|---|
| Capability (`*-core`) | Defines ports; imports abstractions and other `@asol/*` doors |
| Composition (`*-composition`) | Inverts at account boundary — wires `@/` services into runtime object |
| Application wiring | Implements ports; knows both worlds |
| Declarations | Pure data — no inversion needed |

Composition packages invert **account configuration** into runnable tasks (`database`, `images`, `crypto`, etc.) without capability packages knowing Vercel project names.

## Fail-closed defaults

Ports default to deny or no-op:

- `@asol/orders-core` identity port — fails closed so unregistered server cannot act as super admin
- `@asol/data-core` telemetry — silent until observability registers
- Storage profiles — validated at server port registration startup

Missed wiring surfaces in dev traces or tests, not silent wrong behavior in production.

## Anti-patterns (violates inversion)

| Anti-pattern | Fix |
|---|---|
| Package imports `@/core/config` | Pass value through port or `configure*Core()` |
| Feature component imports Turso client | Route through `@asol/data-core` door |
| Two wiring modules for same port | Consolidate to one seam |
| Route handler constructs DB directly | Use server service → query → repository |

## Source Map

- Server registration: `src/core/composition/server-ports.ts`
- Browser registration: `src/core/composition/browser-ports.ts`
- Example fail-closed: comments in `server-ports.ts` for orders-core identity

## Related Documents

- [Ports and Contracts](./ports-and-contracts.md)
- [Composition Model](../04-composition/composition-model.md)
- [Dependency Direction](../01-principles/dependency-direction.md)

## Change Impact

Splitting a port or changing its surface requires updating all wiring modules and contract tests — packages and app must move together.

## Invariants

1. Dependency direction points inward toward abstractions defined in packages.
2. Concrete implementations live in `src/` or `*-composition`, never inside unrelated capability packages.
3. Composition roots are the only place that runs all registrations for the full app.
