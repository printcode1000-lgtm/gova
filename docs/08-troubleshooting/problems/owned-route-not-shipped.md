# A route's owner does not ship it: `307` then `404`

## Symptom

A browser request to a Business API returns `404`. Following it shows two hops:

```
GET https://gova-swart.vercel.app/api/profile/store-images?uid=…   307
GET https://asol-profiles.vercel.app/api/profile/store-images?uid=…  404
```

The client reports it as a transport failure, not a routing one:

```
[AsolApiClient] GET /api/profile/store-images?uid=… failed: requestFailed
ApiError: requestFailed
```

`/api/health` is `200` on both origins, the deployment is `READY`, and every
repository gate is green.

## Cause

The route ownership registry decides which origin a client calls. The cutover
declared ownership for the whole Business API surface, but a workload only
serves a route if `services/<owner>/src/app/**/route.ts` exists and exports that
method. Ownership was declared ahead of the capability move, so the compatibility
boundary redirected live traffic to deployments that had no handler.

At its worst this covered **63 route+method pairs**, including
`POST /api/auth/login` and `POST /api/auth/register` — sign-in and registration
were down in production while every gate reported success.

The capability, not the credential, was what was missing. `asol-submain` already
held `ASOL_SESSION_SIGNING_SECRET`, the users database, and the password-recovery
mail keys. What it lacked was a door: `@asol/submain-composition` exposed only
`search`, `cart`, `catalog` and `config`, and no route file existed.

## Why every gate stayed green

Three checks surround this decision and none of them covered it:

| Gate | Proves | Blind to |
| --- | --- | --- |
| `api:inventory` | every route+method has exactly one owner | whether that owner has a handler |
| `gova:artifact:verify` | gova ships no Business API function | where the traffic went instead |
| `smoke:services` / `smoke:deployed` | one route per account reaches its data | the routes that do not exist — a probe is written against a route that does |

A per-account smoke probe can only ask about a route someone chose to write.
That makes it a liveness check for the account, never a coverage check for the
surface the account owns.

## What now prevents it

`scripts/tests/route-ownership-coverage.test.ts` (`npm run test:route-ownership`,
and part of `test:deployment-tools`) cross-references the AST ownership
inventory against the handlers each service actually exports. It fails in both
directions:

- a route+method whose owner ships nothing, unless it is in `KNOWN_UNSHIPPED`;
- an entry in `KNOWN_UNSHIPPED` that is now shipped — the backlog may only
  shrink, so a fix cannot silently leave the list stale.

`KNOWN_UNSHIPPED` in `scripts/route-ownership-coverage.ts` is the remaining
backlog. **Every line in it is a live production 404.** Never add one: a new
unshipped route is a new outage, and the gate exists to refuse it.

## A second failure the same gap hid: pinned data source, unpinned runtime

Shipping the handler is not enough if the account cannot reach its database.

Every isolated composition root calls
`registerDataCoreRuntimeConfigPorts({ forceRemoteDataSource: true })`, which
pins `dataSource` to `remote`. The per-database Turso guards do not read the
data source — they read `isDevRuntime()` — so an account with a pinned remote
source still refused every advertisements read with:

```
Turso advertisements DB cannot be accessed during development runtime.
```

Health stayed `200`, the deployment reported `READY`, and the route answered
`500 internalServerError` with the reason swallowed. The same shape as every
other outage in this family.

**Fix:** `forceRemoteDataSource` now pins `isDevRuntime` and `isDevelopment` too.
A deployment that cannot run SQLite is not a development runtime, whatever the
environment says — an account states both halves of that invariant or neither.
Leaving one half to configuration is exactly what made the first half
insufficient.

## What now sweeps the whole surface

`npm run smoke:owned-reads` (`scripts/check-owned-route-reads.ts`, and part of
`smoke:deployed`) asks **every owned GET route on every account**, against the
real production origins.

It exists because the per-account smoke gates probe one route each. That proves
an account is alive; it cannot prove the account can serve the surface it owns,
and three separate outages lived in that gap — the unregistered control ports,
the 63 unshipped pairs, and the unpinned dev runtime above.

The rules that make it readable:

- **Reads only.** A `GET` has no side effect, so the whole owned surface can be
  swept against production without writing anything.
- **A `4xx` is a pass.** It means the handler ran and refused, which is what an
  unauthenticated or parameterless probe should get.
- **A `5xx` is a failure**, and so is a body naming an unconfigured port behind a
  `200`. Only those say the route could not run at all.

It found three failures on its first run, one of which was a status-mapping bug
nobody had noticed: control's log stream reported `sessionTokenInvalid` as a
`500`, turning a rejected request into a server fault. Routes answer through the
shared `businessApiErrorStatus` mapping for this reason — a two-branch guess in
one route drifts from the application the moment a third error code exists.

Service routes also log any unmapped `5xx` before returning it
(`businessErrorResponse`), so a swallowed server fault is visible in the
deployment's own output rather than only in a status code.

## Working the backlog down

For each pair, decide which of the two facts is wrong:

1. **The owner is right, the handler is missing.** Ship it. Add the capability to
   `packages/<owner>-composition` as a named task, write
   `services/<owner>/src/app/<route>/route.ts` against that task, and delete the
   line. Use `businessErrorResponse` (or the account's equivalent) so the moved
   route answers the same code and status as the application — a client cannot be
   moved to an origin that answers the same failure differently.
2. **The owner is wrong.** Some routes cannot be served by their declared owner:
   `/api/profile/reviews` reads the product database as well as the profile
   shards, and `asol-profiles` holds no product credentials. Those belong to a
   runtime that has both. Change the registry, not the account's credentials —
   widening an account's secrets to match a routing mistake is how least
   privilege is lost.

Two mechanical points that will come up:

- The mirror refuses an npm package the service does not declare
  (`submain: mirrored code imports npm packages this service does not declare`).
  Add it to `services/<owner>/package.json`, refresh the lockfile, and run
  `npm install` in that folder before building — the remote build installs the
  uploaded folder against its own lockfile alone.
- `SUBMAIN_RUNTIME_REQUIRED_ENV_KEYS` still inherits `GOVA_RUNTIME_REQUIRED_ENV_KEYS`
  wholesale. gova's list is now seven public origins, so the inheritance quietly
  emptied submain's declaration. Derive each workload's keys from its own graph.
