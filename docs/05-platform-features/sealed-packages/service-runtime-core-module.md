# `@asol/service-runtime-core`

## Mission

What every service deployment does identically: the CORS boundary, error→status mapping, and
liveness. CORS itself is not implemented here — this package consumes
[`@asol/cors`](./cors-module.md), which owns every `Access-Control-*` header in the repository.

The six mirrors are separate Next.js projects that share no application code by design. What they
were sharing anyway was five hand-copied `src/app/lib/http.ts` files and six hand-copied health
routes — and the comments in those files state outright that the status mapping "mirrors
`mapOrderError`", by eye.

## Door

| Door | Import | Contents |
| :--- | :--- | :--- |
| `.` | `@asol/service-runtime-core` | `createServiceHttp`, `mapErrorStatus`, `shardHealthResponse`, `credentialHealthResponse` |

Framework-free: `Request` and `Response` only, so it runs in every runtime a deployment might be
built for. Its one repository dependency is [`@asol/cors`](./cors-module.md), which is itself
dependency-free. The direction is one-way — `services/* → @asol/service-runtime-core → @asol/cors` —
and `@asol/cors` imports nothing from here.

## Mechanism here, policy in the deployment

```ts
// services/orders/src/app/lib/http.ts
const ORDER_ERROR_RULES: readonly ErrorStatusRule[] = [
  { status: 401, equals: ['userNotFound'] },
  { status: 403, equals: ['Forbidden'], includes: ['only'] },
  { status: 404, includes: ['not found', 'notFound'] },
  { status: 400, includes: ['required', 'invalid', 'must', 'does not'] },
];

const http = createServiceHttp({
  cors: createCorsPolicy({
    origins: reflectRequestOrigin(),
    methods: ['GET', 'OPTIONS'],
    headers: ['Content-Type', 'Accept'],
  }),
  defaultRules: ORDER_ERROR_RULES,
});
```

Rules are evaluated in order and the first match wins, which is what lets a specific code beat a
broad `includes` rule placed after it. The **method** list stays per-deployment because it is a real
per-deployment fact: a read-only deployment advertising `POST` describes a route it does not have.
The **header** list does not: it is one list for the whole system, stated once in
[`@asol/cors`](./cors-module.md#browser_request_headers).

## Why the main app's helpers still are not reused

`apiSuccess` / `mapServiceError` reach into request tracing and system logging, which would pull
most of the application's module graph into a deployment that only reads. That reasoning was
already written in each of the five copies; it is now written once, and the part that carried no
such weight — the message fallback and rule ordering — is shared.

## CORS

Owned by [`@asol/cors`](./cors-module.md), not by this package. A deployment states a `CorsPolicy`
and `createServiceHttp` / `createServiceProxy` pass it through; `npm run architecture:check` fails
if any file here writes an `Access-Control-*` header of its own.

What this package still owns is that the policy reaches **every** response a deployment builds,
including its error responses — without CORS on an error the browser reports a CORS failure instead
of the error the deployment actually returned, and the real cause never reaches the caller — and
that the boundary in `services/*/src/proxy.ts` answers a preflight for every path the deployment can
receive, including the ones it does not implement.

`createServiceProxy()` defaults to reflecting the request origin over the full browser method set,
because a boundary standing in front of paths it does not enumerate cannot narrow what it has not
seen. `BROWSER_REQUEST_HEADERS` and the reasoning behind one shared request-header list now live in
[`@asol/cors`](./cors-module.md#browser_request_headers).

## Health

Two shapes, because the deployments genuinely differ:

- `shardHealthResponse` — a sharded database reports how many shards are configured and which are
  missing (orders, profiles).
- `credentialHealthResponse` — the rest report a named flag per credential.

One rule holds across both: report whether a credential is **present**, never its value, so the
endpoint can stay public. `requireAll` is off by default because every deployment here has optional
credentials whose absence degrades one feature rather than the service.

## Related Documents

- [`@asol/cors`](./cors-module.md) — the single source of truth for every CORS decision this package applies.
