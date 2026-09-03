# `@asol/cors`

## Mission

The single source of truth for CORS in this repository. Every `Access-Control-*` header any ASOL
surface sends is produced here, and nowhere else.

Nine surfaces used to write that record by hand: five service HTTP helpers, the shared service
proxy, the main application's API boundary, the control route seam, the two notification send
endpoints, the Next.js header table, and the local static preview. They drifted, and two of the
drifts became outages:

- **A mirror answered a narrower request-header list than the client sends.** The preflight rejected
  the call before it left the browser, so the caller saw `Unable to reach the server` — a network
  outage, for a deployment that was up and would have answered.
- **A runtime answered every preflight with a bare `204` and no allow-origin header.** The whole
  Super Admin console — user search, System Logs, OTA administration, build jobs — was unreachable
  from a browser while every server-side probe passed. See
  [preflight-answered-without-cors-headers.md](../../08-troubleshooting/problems/preflight-answered-without-cors-headers.md).

Consolidation alone does not prevent the tenth copy, so the rule is enforced: `npm run
architecture:check` fails on any `Access-Control-` header name written outside `packages/cors/`.

## Door

| Door | Import | Contents |
| :--- | :--- | :--- |
| `.` | `@asol/cors` | `createCorsPolicy`, `resolveCorsHeaders`, `handleCorsPreflight`, `withCorsHeaders`, `setCorsHeaders`, origin helpers, `corsOriginsFromEnv`, `BROWSER_REQUEST_HEADERS`, `BROWSER_REQUEST_METHODS` |

Dependency-free and framework-free. It is compiled into six separate Vercel uploads, so a dependency
here is a dependency in six deployments; `Request`, `Response`, and `Headers` are the whole
contract. It depends on nothing else in this repository either — not on `@asol/service-runtime-core`,
not on the application, not on any service — so no cycle is possible.

## Responsibilities

| File | Owns |
| :--- | :--- |
| `src/types.ts` | The vocabulary: `CorsOriginPolicy`, `CorsPolicyInput`, `CorsPolicy`, `CorsRequestLike` |
| `src/origins.ts` | Origin parsing, exact-origin comparison, wildcard detection, development origins, the three origin-policy constructors |
| `src/env.ts` | The `ASOL_CORS_ORIGINS` adapter — the only place that variable's name is spelled |
| `src/policy.ts` | `createCorsPolicy` and its security invariant; `BROWSER_REQUEST_HEADERS`, `BROWSER_REQUEST_METHODS`, `PREFLIGHT_MAX_AGE_SECONDS` |
| `src/headers.ts` | The only place an `Access-Control-*` header name is written |
| `src/preflight.ts` | `isCorsPreflight`, `handleCorsPreflight` |
| `src/apply.ts` | `setCorsHeaders` (in place), `withCorsHeaders` (new response) |

## Dependency direction

```text
services/*                     app / API routes / next.config.ts
    ↓                                        ↓
@asol/service-runtime-core                   ↓
    ↓                                        ↓
             @asol/cors ←───────────────────┘
```

`@asol/cors` is a leaf. `services/*/src/proxy.ts` stays a per-deployment entrypoint and only
*consumes* the shared boundary; `@asol/service-runtime-core` keeps proxy and HTTP orchestration but
implements no CORS of its own.

## The three origin policies

| Policy | Answer | Used by |
| :--- | :--- | :--- |
| `reflectRequestOrigin()` | Echo the caller's origin; `*` when it sends none | The six deployments, the control runtime, the notification send endpoints |
| `allowOrigins([...])` | Exact match only; no header at all for anything else | The main application's `/api/*` boundary (`src/proxy.ts`) |
| `anyOrigin()` | Always `*` | The Next.js header table for non-API paths, the local static preview |

Echoing is safe **only** because no ASOL surface accepts credentials: the cross-origin contract is an
explicit signed header (`X-Asol-Session-Token`) or a signed grant in the body, never a cookie, so a
permissive origin cannot be used to ride on someone's session. `createCorsPolicy` refuses to combine
credentials with an echoed or wildcard origin, so that guarantee cannot be quietly lost.

Comparison in `allowOrigins` is **exact**. `https://app.example.evil.tld` starts with an allowed
`https://app.example` and ends with an attacker-controlled host; a prefix or suffix check hands the
response to it.

## How a surface consumes it

```ts
// services/orders/src/app/lib/http.ts — the deployment states policy, not headers
const http = createServiceHttp({
  cors: createCorsPolicy({
    origins: reflectRequestOrigin(),
    methods: ['GET', 'OPTIONS'],
    headers: ['Content-Type', 'Accept'],
  }),
  defaultRules: ORDER_ERROR_RULES,
});
```

```ts
// a route, a proxy, or a header table
const headers = resolveCorsHeaders(policy, request);   // the record
const answer = handleCorsPreflight(policy, request);   // 204 + the same record
const wrapped = withCorsHeaders(response, policy, request); // an existing response, status kept
setCorsHeaders(response.headers, policy, request, { overwrite: false }); // a boundary, in place
```

The **method** list is a per-surface fact: a read-only deployment advertising `POST` describes a
route it does not have. The **request-header** list is not — see below.

## `BROWSER_REQUEST_HEADERS`

```text
Content-Type, Authorization, Accept, X-Asol-Session-Token, X-Asol-Trace-Id
```

One client speaks to every surface, so a surface advertising fewer headers does not answer less: the
browser's preflight rejects the call before it is sent and the client reports an unreachable server,
with no CORS wording anywhere to point at the cause. Widening the list is safe — no surface accepts
credentials, and a header a surface ignores stays ignored.

`src/proxy.ts`, `next.config.ts`, `services/profiles/src/app/lib/http.ts` and the control route seam
answer with this constant. The remaining mirrors still declare narrower literal lists of their own;
those are per-deployment configuration, not a second implementation.

## Configuring allowed origins

`ASOL_CORS_ORIGINS` is a comma-separated origin list, read only through `corsOriginsFromEnv`. Every
caller states what an unset variable means for it, because the answers genuinely differ:

| Caller | Fallback when unset | Why |
| :--- | :--- | :--- |
| `src/core/config/cors-origins.ts` → `src/proxy.ts` | `[]` — nothing is allowed | An unconfigured deployment refuses cross-origin reads rather than opening them |
| `packages/storage-core/src/server/transport/r2-cors-policy.ts` | `['*']` | A bucket with no CORS rules cannot be reached by a browser at all; the bytes are public |
| `packages/ota-core/scripts/sync-cors.ts` | `['*']` | Same: the OTA manifest is public bytes fetched by a WebView |

The Configuration layer owns the environment read (`src/core/config/cors-origins.ts` is the
application's one allowlisted reader); the parsing and the variable's name belong to this package.
`DEVELOPMENT_ORIGINS` is exported for a caller that wants localhost and the Capacitor/Ionic shell
origins as its fallback; no production surface uses it.

Production origins are never hard-coded here. A deployment-specific domain belongs in
`ASOL_CORS_ORIGINS` on that account, not in this package.

## Security invariants

1. **Never `Access-Control-Allow-Origin: *` with credentials.** `createCorsPolicy` throws
   `corsCredentialsWithUnverifiedOrigin` for a credentialed policy whose origin rule is wildcard,
   reflected, or a list containing `*`.
2. **No fuzzy origin matching.** Exact equality only.
3. **A disallowed origin gets no origin header**, not a header naming someone else. The browser then
   blocks the read, which is the correct outcome and the only one that cannot be mistaken for
   permission.
4. **`Vary: Origin` whenever the answer is origin-dependent**, including when the origin was
   *refused* — a shared cache that stored the refusal without it would go on refusing an origin that
   is allowed. An explicit wildcard does not vary and is not marked as varying, so caches in front of
   public bytes are not fragmented per origin.
5. **Preflight and real response are one decision.** `handleCorsPreflight` is built from the same
   `resolveCorsHeaders` the actual response uses, so the two can never disagree about which origins
   or headers are allowed.
6. **A `204` is not a passing preflight.** It passes only when it carries an allow-origin header.

## Where CORS logic is forbidden

Outside `packages/cors/`, no file may write an `Access-Control-*` header name. `checkCorsContract`
in `packages/architecture-core/src/checks/cors-contract.ts` scans `src/`, `packages/`, `scripts/`,
`services/*/src/` and the root config files on every `npm run architecture:check`, and fails the run
with the file and line. Two exemptions:

- **comment lines** — every proxy explains why it exists by naming the header whose absence caused
  the outage, and that prose is the most useful thing in the file;
- **tests** — asserting the wire format is the only way to test it, and a test cannot serve traffic.

A route, a proxy, a service helper, or a config table that needs CORS states a policy and asks this
package for the headers.

## Test gate

```bash
npm run test:cors-core
```

Covers allowed and rejected origins, a missing `Origin`, production and development origin handling,
credentials behaviour, the method and header lists, preflight and refused preflight, `Vary: Origin`,
the wildcard-plus-credentials refusal, and agreement between preflight and normal responses.
`npm run test:service-runtime-core` and `npx tsx scripts/tests/service-cors-boundary.test.ts` cover
the deployment-level behaviour on top of it.

## Related Documents

- [`@asol/service-runtime-core`](./service-runtime-core-module.md) — the service runtime that consumes this package.
- [Preflight answered without CORS headers](../../08-troubleshooting/problems/preflight-answered-without-cors-headers.md) — the two outages this package exists to prevent.
- [Environment Variables](../../02-data-and-storage/environment-variables.md) — `ASOL_CORS_ORIGINS`.
- [R2 Storage](../../02-data-and-storage/image-storage/r2-storage.md) — the bucket-level CORS rules that share the same origin configuration.
