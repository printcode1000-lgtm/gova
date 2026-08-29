# `@asol/service-runtime-core`

## Mission

What every service deployment does identically: CORS, error→status mapping, and liveness.

The six mirrors are separate Next.js projects that share no application code by design. What they
were sharing anyway was five hand-copied `src/app/lib/http.ts` files and six hand-copied health
routes — and the comments in those files state outright that the status mapping "mirrors
`mapOrderError`", by eye.

## Door

| Door | Import | Contents |
| :--- | :--- | :--- |
| `.` | `@asol/service-runtime-core` | `createServiceHttp`, `mapErrorStatus`, `shardHealthResponse`, `credentialHealthResponse` |

Dependency-free and framework-free: `Request` and `Response` only, so it runs in every runtime a
deployment might be built for.

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
  methods: 'GET, OPTIONS',
  headers: 'Content-Type, Accept',
  defaultRules: ORDER_ERROR_RULES,
});
```

Rules are evaluated in order and the first match wins, which is what lets a specific code beat a
broad `includes` rule placed after it. The **method** list stays per-deployment because it is a real
per-deployment fact: a read-only deployment advertising `POST` describes a route it does not have.
The **header** list does not — see [CORS](#cors).

## Why the main app's helpers still are not reused

`apiSuccess` / `mapServiceError` reach into request tracing and system logging, which would pull
most of the application's module graph into a deployment that only reads. That reasoning was
already written in each of the five copies; it is now written once, and the part that carried no
such weight — header construction, the message fallback, rule ordering — is shared.

## CORS

Every deployment echoes the request origin and accepts no credentials — the browser bridge sends
`credentials: "omit"` — which is what makes echoing safe. `Vary: Origin` is always set: echoing an
origin without it poisons shared caches. An **error** response carries the CORS headers too, or the
browser reports a CORS failure instead of the error the deployment actually returned.

### `BROWSER_REQUEST_HEADERS`

The accepted **request** headers are one list for the whole system, exported from this door:

```text
Content-Type, Authorization, Accept, X-Asol-Session-Token, X-Asol-Trace-Id
```

One client speaks to every deployment, so a mirror advertising fewer headers does not answer less —
the browser's preflight rejects the call before it is sent and the client reports an unreachable
server, with no CORS wording anywhere to point at the cause. Widening the list is safe: no
deployment accepts credentials, and a header a service ignores stays ignored.

`services/profiles/src/app/lib/http.ts`, `src/proxy.ts`, and the `headers()` entry in
`next.config.ts` all read this constant; the package test fails if any of the three spells the list
by hand again. The remaining mirrors still declare their own literal lists.

## Health

Two shapes, because the deployments genuinely differ:

- `shardHealthResponse` — a sharded database reports how many shards are configured and which are
  missing (orders, profiles).
- `credentialHealthResponse` — the rest report a named flag per credential.

One rule holds across both: report whether a credential is **present**, never its value, so the
endpoint can stay public. `requireAll` is off by default because every deployment here has optional
credentials whose absence degrades one feature rather than the service.
