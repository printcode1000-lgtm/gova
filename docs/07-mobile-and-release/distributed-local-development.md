# Distributed Local Development

## Purpose

`npm run dev:distributed` runs the **whole production topology on one machine**:
eight Next.js processes on eight ports, with gova's client bridge pointed at the
local origins exactly the way production points it at public ones.

It exists because the ordinary `npm run dev` is a single process, and a single
process is the one environment where a routing mistake cannot fail.

## Why a second development mode exists

`npm run dev` starts gova alone on port 3001. gova still contains handlers for
routes it does not own, so a business call that *should* have been addressed to
`products` or `orders` is answered locally by gova itself. The call succeeds, the
feature looks correct, and the ownership error survives until a deployment splits
the runtimes apart — at which point the owner has no such handler and the caller
gets a 404 from an account that never implemented it.

That is the failure the isolated-service smoke gates were added for, and it is
why route ownership had to be proven against production instead of locally.
`dev:distributed` removes the fallback: every runtime is its own process at its
own origin, so an unowned call fails on the developer's machine.

```bash
npm run dev                    # gova alone on 3001 — fast, but forgiving
npm run dev:distributed        # all eight runtimes, no fallback
npm run dev:distributed:smoke  # start all eight, prove ownership, exit
```

## The topology

Ports and origins are declared once, as pure data with no imports, in
`packages/account-declarations/src/accounts/local-development.ts`:

| Runtime | Port | Local origin |
| --- | ---: | --- |
| `gova` | 3001 | `http://127.0.0.1:3001` |
| `control` | 3002 | `http://127.0.0.1:3002` |
| `notifications` | 3003 | `http://127.0.0.1:3003` |
| `products` | 3004 | `http://127.0.0.1:3004` |
| `orders` | 3005 | `http://127.0.0.1:3005` |
| `profiles` | 3006 | `http://127.0.0.1:3006` |
| `submain` | 3007 | `http://127.0.0.1:3007` |
| `sub2main` | 3008 | `http://127.0.0.1:3008` |

`localDevelopmentPublicEnv()` in the same file builds the seven
`NEXT_PUBLIC_ASOL_*_URL` values gova needs. Only gova receives them: it is where
the browser loads the application, and every business call it makes is addressed
to an owner. The six workloads and control do not resolve each other.

Each child process is also given `ASOL_RUNTIME_ACCOUNT=<name>` — without it the
environment guard would validate that runtime against gova's declaration — and
gova additionally gets `ASOL_RUNTIME_ROLE=gova-frontend`.

Run a subset with `--only`:

```bash
npx tsx scripts/dev-distributed.ts --only=gova,products,orders
```

An unknown name is refused rather than ignored.

## No `npm ci` per service

Every runtime starts from the repository's own pinned Next binary
(`node_modules/next/dist/bin/next`) executed from that runtime's folder — the
same way the service smoke gates already run them. There is no per-service
install step, so starting the topology costs nothing beyond the processes
themselves.

This is deliberately **not** what Vercel does. Vercel installs each service
against its own `package.json`, which is why `npm run services:build` exists as a
separate gate: `dev:distributed` proves *routing*, not that an isolated upload
resolves its own dependencies. See
[the module isolation rules](../01-architecture/02-packages/module-isolation-rules.md).

## A held port stops the run

Before starting anything, every selected port is tested by **binding** it, the
same way Next is about to:

```text
Ports already in use: products (3004). Stop the previous run first — starting on
a different port would give the bridge origins that do not match the topology.
```

Two decisions are load-bearing here.

**Binding, not probing.** The first version asked the port over HTTP and treated
a failed request as "free". That missed a dev server bound to `::` while the
probe went to `127.0.0.1`, and the run then died on `EADDRINUSE` several seconds
later with a message about the wrong thing.

**Refusing, not relocating.** Falling back to another port would start a topology
whose real origins no longer match the ones baked into gova's bridge
environment. The run would come up, and the mismatch would surface later as a
routing bug rather than as the stale process it actually is.

**`npm run server:stop` does not clear this.** That script
(`scripts/stop-dev-server.ts`) only frees port **3001**. After an interrupted
distributed run, ports 3002–3008 can still be held and must be freed by hand.

## What `--smoke` proves

`dev:distributed:smoke` starts every runtime, runs the probes below, then stops
everything and exits non-zero on any failure. It is the local equivalent of
`smoke:services`, one layer earlier.

**Health is deliberately not the probe.** The outage these gates exist for left
`/api/health` answering 200 on every account while every data route answered 500.
So each destination is asked for a route it actually owns, and an authorization
refusal or a validation error counts as an answer — a 404 or a 500 does not.

| Runtime | Probe | Accepted |
| --- | --- | --- |
| `gova` | `/api/health` | 200 |
| `control` | `/api/super-admin/build-jobs` | 400, 401, 403 |
| `notifications` | `/api/notifications/send` | 200, 400, 401, 405 |
| `products` | `/api/products?limit=1` | 200, 400 |
| `orders` | `/api/orders?uid=probe&limit=1` | 200, 400, 401, 403, 404 |
| `profiles` | `/api/profile/store-details?uid=probe` | 200, 400, 404 |
| `submain` | `/api/search/products?q=probe&limit=1` | 200, 400 |
| `sub2main` | `/api/storage/upload` | 400, 401, 403, 405 |

Before each probe runs, `resolveRouteOwner` from `@asol/account-bridge/routes` is
asked who owns that path. If the registry does not name the account being probed,
the smoke fails on the **probe** rather than the runtime:

```text
products: probe /api/products is owned by submain, not products
```

Without that check a probe could drift onto a route the account no longer owns
and keep passing, which would make a green smoke say nothing about the topology
it claims to verify.

Finally, gova's compatibility boundary is checked separately: `/api/system-logs`
must answer **307** with a `Location` on the control origin, and the redirect is
read rather than followed. A 200 there would mean gova still implements a route
it has handed to control.

## Relationship to the release gates

| Gate | Runs where | Proves |
| --- | --- | --- |
| `dev:distributed:smoke` | developer machine, source | each destination answers a route it owns |
| `smoke:services` | locally built service copies | the same, against what Vercel will build |
| `smoke:deployed` | the eight deployed origins | the same, against production |

They are the same question asked at three distances. The first is the only one
that costs nothing and runs before a commit — see
[deployment-targets.md](./deployment-targets.md) for the other two.

## Related Documents

- [Deployment Targets](./deployment-targets.md) — the eight accounts this mirrors.
- [Scripts & Workflows](./scripts-and-workflows.md) — the full command surface.
- [Service Boundaries](../01-architecture/06-runtime-boundaries/service-boundaries.md) — what each runtime owns.
- [Runtime Contract](../09-agent-knowledge/runtime-contract.md) — the five surfaces every change must satisfy.
