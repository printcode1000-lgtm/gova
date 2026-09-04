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

## Working the backlog down: `/api/notifications/preferences`

The push mute switch presented exactly the symptom above from `/settings/notifications`:

```
[AsolApiClient] GET /api/notifications/preferences?uid=…&phone=… failed: requestFailed
```

The catch-all `{ owner: 'notifications', pattern: '/api/notifications/**' }`
owned it, and `asol-notifications` ships only `/api/notifications/send`.

It could not be fixed by writing the handler on that account. Both operations
resolve the caller against the **users repository** before reading or writing the
preference, and `asol-notifications` must never hold the users database — the same
constraint that moved `device-token`. So ownership moved to `submain`, which holds
the users and the notifications databases, `@asol/submain-composition` gained
`devices.getPushPreference` / `devices.setPushPreference` over the application's
own service, and `services/submain/src/app/api/notifications/preferences/route.ts`
ships `GET`, `POST` and `OPTIONS`. The uid/phone identity contract and the error
codes are unchanged, so no client moves with the origin.

Both lines left `KNOWN_UNSHIPPED` in the same change — which is the only way a
line may leave it.

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

## A third failure: the moved route answers a different status

A route can be shipped by the right owner, reach its data, and still be wrong.

Most canonical routes map errors through `mapServiceError`, so a mirror using the
shared `businessApiErrorStatus` matches by construction. Sixteen do not — they
map statuses themselves — and a mirror written against the shared mapping
silently downgrades those:

| Code | Canonical | Shared mapping |
| --- | --- | --- |
| `profileNotFound` | `404` (the rule is "a code containing `NotFound` is a 404") | `500` |
| `invalidHeroSliderConfig` and siblings | `400` | `500` |
| `featureFlagUnknown` | `400` | `500` |

Each turns a caller's mistake into a server fault at the new origin — the exact
thing "no supported client behaviour is lost" forbids, and invisible to anything
that only checks the route exists.

**Fix:** the mapping moves with the route. Each is ported into the service's own
`lib/http.ts` as a named responder — `reviewErrorResponse`,
`advertisementsAdminErrorResponse`, `featureFlagErrorResponse` — rather than
folded into the shared mapping, because these rules are the route family's, not
the application's.

`npm run test:mirror-status-parity` (part of `test:deployment-tools`) refuses the
shape that allows it: a canonical route that maps statuses itself may not be
mirrored by a route that uses only a generic responder. Three shapes pass, and
each is a real answer to *who decides the status*:

1. the mirror delegates to the canonical handler — one mapping, cannot drift;
2. it uses a named responder that is not one of the generic ones;
3. it decides inline, with an explicit non-2xx status literal.

## When the owner is right and the route still cannot move

Two of the remaining entries are not missing handlers. They are package
boundaries doing their job, and the fix is a separation, not a widening.

**The notification surfaces.** `notifications-service-module-contract` forbids
`@asol/notifications-composition` from reaching `@/features/notifications` at
all — the delivery core is a sealed package, and its import surface *is* the
deployment's file surface. Token registration, push preferences, broadcast and
the mobile-push unlock still live in the application feature, so serving them
from `asol-notifications` means moving those services into the sealed package.
Reimplementing them against `@asol/data-core/notifications` would be worse: two
copies of one contract, drifting from the first edit onwards.

**`POST /api/ota/access`.** Every door that reaches `configureOtaCore` and
`otaReleaseService` also reaches `@asol/ota-core`'s client half — the OTA
adapter, the query persister, six Capacitor packages — and `services:sync`
refuses the account. It is right to: a server deployment must not carry native
adapters. Narrowing one door at a time did not converge, because the package's
client and server halves are not separated.

Both refusals came from gates that already existed, and both are correct. The
lesson is the one this whole document is about, in the other direction: when a
guard refuses a move, the answer is to separate the capability, never to widen
the account until the guard goes quiet.

## The local gates do not cover the service trees

`npm run typecheck` compiles `src/` and the packages. Each service has its own
`tsconfig.json` and its own tree, and neither is in that project — so a type
error that exists only inside a mirror passes every local gate and fails the
remote build.

`ActionInput` did exactly that: declared in `order-action-grants.server`,
re-exported by the orders door, imported by the mirror from
`order-actions.server` where it is only used. Root typecheck green, `lint` green,
the full suite green, and `Failed to type check` on Vercel after `main` had
moved.

`services:build` compiles each mirror the way Vercel does, so it catches this —
but the no-gates publish path skipped it. It no longer does: `services:sync`,
`services:build` and `control:build` run before the push in
`assertServiceMirrorsBuild`, which `deploy:all` and `deploy:push` both reach.
`deploy:push:fast` is the one exception, and it says
so: `--fast` skips the mirror builds by name, which is exactly the trade this
incident priced.
The rule that came out of it is narrow and worth keeping: a check may be skipped
when it proves *correctness*, never when it proves the artifact can be built.

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
