# `@asol/orders-core`

The order domain, held once, at `packages/orders-core/`. Seventeen production files: status
derivation, minor-unit pricing, validators, permissions, the actor model, the fulfilment snapshot
rules, and the visibility filter. It is what the main app and the orders deployment both agree an
order *means* — independent of where its rows live.

Held to [the eight module isolation rules](../../01-architecture/02-packages/module-isolation-rules.md).

## One door, and zero of everything else

| Measure | Value |
| :-- | :-- |
| Doors | **1** (`.`) |
| Application edges | **0** |
| `@asol/*` edges | **0** |
| Node builtins, drivers, React, Next | none |

The single door is not minimalism for its own sake. This is one vocabulary with one load-time
contract: the same files run in the browser bundle, on the main app's server, and inside the
orders deployment, so there is no server/browser split to justify a second door. If one ever
becomes necessary it means the domain has divided in two, and the contract test will force that
to be said out loud rather than slipped in.

Zero `@asol/*` edges is the load-bearing one. Persistence lives behind
`@asol/data-core/marketplace-orders`, and the dependency runs **that** way: `data-core` imports
this package for the vocabulary its repositories speak. An edge in the other direction would put
a database back inside the domain, and the package would stop being runnable in a browser.

## The one edge, inverted

This package reached into the application exactly once, for the super-admin predicate in
`actorFromInput`. That is feature internals, not a designated boundary, so it was inverted into
`src/ports/index.ts` rather than budgeted.

**The default fails closed.** An unregistered runtime grants nobody admin rather than granting
everybody — the only safe default here, because the whole point of the predicate is that a
`role=admin` query parameter is not evidence of anything. Admin status comes from the uid and the
phone together.

The visible consequence of a missing registration is therefore harmless and quiet: the real super
admin is treated as an ordinary actor and sees only their own orders. Quiet is the danger, so
**three registration points exist and all three are pinned by the contract test**:

| Where | Why it is there |
| :-- | :-- |
| `src/instrumentation.ts` | The main app's startup hook, before the first request |
| `src/app/api/orders/order-api-helpers.ts` | Every order route in the main app imports it, so this is the registration that cannot be bypassed — a route reached without the startup hook still gets a real predicate |
| `packages/orders-composition/src/index.ts` | The orders deployment has no `instrumentation.ts` of ours; wiring an application capability into one account's runtime is exactly what layer 2 is for |

`configureOrdersCore` merges over the defaults, so registering more than once is free. The
contract test also asserts the behaviour, not just the wiring: unregistered downgrades a claimed
admin role, a registered predicate is honoured on both halves, a matching uid with the wrong
phone is not the super admin, and an actor with no uid is refused rather than defaulted.

## What this changed elsewhere

- `@asol/data-core` dropped **8 budgeted application edges** — the order vocabulary it used to
  reach through `@/modules/marketplace-orders/*`. Its budget went from 41 to 34, and
  `@asol/orders-core` is now pinned in its declared package-door list instead.
- `@asol/orders-composition` imports the door and registers the identity port.
- The orders account declaration no longer names an order file as a mirror entry point. Both
  halves — the reads and the vocabulary — are packages now, and the mirror walker reaches them
  through the package graph. Naming a file inside a sealed package as an entry point would mean
  naming an internal path, which is what the seal forbids.

## A defect this migration surfaced

`packages/service-mirror-core` scanned for module edges with `\brequire\s*\(`. When `data-core`
became an ES module it had to build its own resolver with `createRequire`, and the lazy driver
loads became `nodeRequire(...)` — which that pattern does not match. **Every database driver
silently dropped out of all four service mirrors.** The deployments still built; they would have
failed at the first query with "Cannot find module".

The pattern now follows any identifier ending in `require`, and the mirror test covers
`nodeRequire` explicitly. The lesson is worth more than the fix: a graph walker that misses an
edge produces an upload that *looks* complete, which is the worst failure mode it has — nothing
is red until production.

## Changing this package

1. Keep the door count at one unless the domain genuinely splits.
2. Never import `@/` or `@asol/*` from here. If order logic needs something the application
   knows, declare a port with a safe default and register it from the three seams.
3. Keep it free of node builtins, drivers, React and Next: it must run unchanged in all three
   runtimes.
4. Run `npm run test:orders-core`, `npm run architecture:check`, and `npm run services:sync`.
