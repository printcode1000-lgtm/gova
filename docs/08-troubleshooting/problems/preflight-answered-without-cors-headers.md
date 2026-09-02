# A route reports `Unable to reach the server` while the server is up

## Symptom

The browser reports a network failure for a route whose origin is healthy:

```
NetworkUnavailableError: Unable to reach the server
```

`curl` against the same URL answers normally. Every server-side probe passes —
`smoke:owned-reads`, `smoke:deployed`, the account's own health route — and the
deployment is `READY`. Only the browser fails, and it fails before the request is
sent, so nothing appears in the origin's logs.

Observed in production three times at once: device-token registration from
`/profile?mode=edit`, device-token removal from `/settings`, and user search on
`/super-admin/users`.

## Cause

The preflight was answered without `Access-Control-Allow-Origin`.

A `204` is not a passing preflight. If the response carries no allow-origin
header, the browser refuses to send the real request and surfaces it to the
application as a transport failure — never as the `403`, `404`, or CORS error it
actually is.

Two distinct paths produced that bare `204`:

1. **`asol-control` had no CORS at all.** Its route seams answered business
   requests without CORS headers and six routes answered `OPTIONS` with a bare
   `204`. Every browser call into the Super Admin console — user search, System
   Logs, OTA administration, build jobs — was blocked, while every server-side
   check passed.
2. **A path no route file implements.** An unshipped, unowned, or mistyped
   `/api/**` path never reaches a handler, so Next answers the preflight itself,
   without headers. `POST /api/notifications/device-token` presented this way: a
   route simply not shipped on its owning account looked like an outage.

Both are the same defect — the boundary was per-route, and a route cannot answer
for a path it does not implement.

## Fix

One CORS boundary per deployment, in front of every `/api/*` request:
`createServiceProxy()` from `@asol/service-runtime-core`, installed as
`services/<account>/src/proxy.ts` with `matcher: '/api/:path*'`. It answers every
preflight — implemented or not — and adds the headers to every `/api` response
that does not already set them. Bodies stay with the routes; the boundary only
guarantees the browser is allowed to see them.

The allowed header list is `BROWSER_REQUEST_HEADERS`, shared by every origin, so
no account can answer a narrower list than the client sends. `credentials` are
never allowed: the cross-origin contract is an explicit signed
`x-asol-session-token`, never a cookie, so a permissive origin cannot be ridden
on someone's session.

`device-token` itself was a second, independent defect: it was unshipped because
both operations verify device ownership through the users repository, which
`asol-notifications` must never hold. It now lives on `submain`, which holds both
the users and notifications databases.

## The guard

`npm run test:service-cors` (inside `test:deployment-tools`) asserts that every
deployment installs the shared boundary at the full `/api` matcher, and that a
preflight **for a path no route implements** answers with a real
`Access-Control-Allow-Origin`, an allow-methods list containing `DELETE`, and an
allow-headers list equal to `BROWSER_REQUEST_HEADERS`.

## The lesson this cost

**The status code was never the acceptance criterion.** The migration audit
recorded "CORS verified on every origin" after seeing `204` from each account
without ever reading the headers. That check could not fail: a deployment with no
CORS whatsoever passes it. The whole Super Admin console was unreachable from a
browser for the entire time that check was green.

This is the same shape as every other outage in this migration, recorded in
[owned-route-not-shipped.md](owned-route-not-shipped.md) and
[main-push-without-vercel-deployment.md](main-push-without-vercel-deployment.md):
**a gate that cannot fail proves nothing.** A check is worth what it rejects, so
verify it by breaking the thing it is meant to catch. This one was verified by
removing `services/control/src/proxy.ts` and confirming it fails.
