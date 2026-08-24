# Runtime Targets

## Purpose

Every change ships into five different runtimes. This document is the checklist
that says which ones a change reaches, what each one forbids, and where that is
enforced.

It exists because the cost of skipping it is measured: a page was edited without
asking which runtimes render it, and the release failed twice — once because
`output: "export"` rejects a `force-dynamic` page, and again because the page's
client bundle carried an inventory of server secret names into the mobile app.
Neither is visible from the file being edited.

## Scope

The five shipped targets and the rules that differ between them. Layer rules are
in [layer-stack.md](../10-application-layers/layer-stack.md); this is about
*where code runs*, not what may import what.

## The five targets

| Target | Build | Runs | Server available |
|---|---|---|---|
| Local development | `npm run dev` | Node + browser | Yes |
| Web production | `npm run build` → Vercel | Node serverless + browser | Yes |
| Static export (`out/`) | `npm run build:static` | Browser only, from files | **No** |
| Android | static export + Capacitor shell | Native WebView | **No** |
| iOS | static export + Capacitor shell | Native WebView | **No** |

Android and iOS ship the **same** `out/` bundle. A rule about the static export
is automatically a rule about both stores — there is no separate mobile build to
fix later.

## What the static export forbids

`output: "export"` prerenders every route to files. There is no server at
runtime, so:

- **`export const dynamic = "force-dynamic"` fails the build outright.** Not a
  warning — `next build` exits and takes the release with it.
- No route handlers, no middleware, no request-time rendering.
- Anything a `"use client"` module imports is **shipped to the device**. That
  includes constants pulled in transitively:
  `@asol/account-declarations` carries `requiredEnv`/`optionalEnv`, so importing
  it from a client component put the names of every server secret into a static
  chunk, and `auditStaticMobilePushSecurity` failed the release over it. The
  same leak returns if a development-only page that imports declarations shares
  a feature `./ui` barrel with a module the root layout imports — keep
  declaration-backed pages on the `.` door instead.

## How a route is excluded

`STATIC_ROUTE_IGNORELIST` in
`packages/ota-core/src/publishing/build/out-runtime-config.ts` deletes paths
from the temporary build tree before `next build` runs. A route listed there
does not exist in `out/`, so it never reaches Android or iOS.

`app/api`, `app/dev`, and most `app/super-admin/*` operations pages are listed.

Exclusion from the static export does **not** exclude a route from web
production. For that, guard it:

```ts
if (!getServerRuntimeContext().isDevelopment) notFound();
```

Development-only surfaces need both: the ignorelist keeps them out of the
mobile bundle, the guard keeps them out of production.

## Before changing a page or route

Ask, in order:

1. **Which targets render this?** A route under `app/dev` or listed in
   `STATIC_ROUTE_IGNORELIST` reaches development and web only. Everything else
   reaches all five.
2. **If it reaches the static export**, it MUST be statically renderable — no
   `force-dynamic`, no request-time data.
3. **If it is `"use client"`**, what does its import graph pull onto the device?
   Server registries, declaration objects, and env inventories MUST NOT be
   reachable from a client component that ships.
4. **If it is development-only**, does it have *both* the ignorelist entry and
   the `isDevelopment` guard? One without the other leaks it into the other
   target.

## Enforcement

`checkRuntimeTargetContract` (in `npm run architecture:check`) fails the build
when a page declares `force-dynamic` while still inside the static export. It
reads `STATIC_ROUTE_IGNORELIST` directly, so the check cannot drift from the
list it enforces, and it names both ways out: drop the directive, or exclude the
route.

It exists because the alternative is finding out from `build:static`, minutes
into a release, after every other gate has passed.

Invariants 3 and 4 below are not mechanically enforced. Rule 3 in particular —
a `"use client"` module reaching an environment-variable inventory — is caught
only by `auditStaticMobilePushSecurity` during the static build, and only for
the patterns it knows.

## Invariants

1. A route reachable from the static export MUST be statically renderable.
2. A route excluded from the static export MUST NOT be assumed absent from web
   production; that requires its own guard.
3. A `"use client"` module MUST NOT import a server registry, declaration set,
   or environment-variable inventory.
4. Android and iOS ship the same `out/` bundle: a static-export rule is a rule
   for both, and neither has a separate fix.

## Forbidden bypasses

```text
MUST NOT: force-dynamic on a route that is in the static export
MUST NOT: development-only page in the sidebar or in out/
MUST NOT: "use client" module → @asol/account-declarations (or any env inventory)
MUST NOT: assume a route is dev-only because it is excluded from out/
```

## Source Map

- Exclusion list: `packages/ota-core/src/publishing/build/out-runtime-config.ts`
- Static build: `scripts/build-static.ts`, `packages/ota-core/src/publishing/build/build-out.ts`
- Secret audit: `auditStaticMobilePushSecurity` in `out-runtime-config.ts`
- Runtime facts: `src/core/config/runtime-context.server.ts`

## Related Documents

- [runtime-isolation.md](./runtime-isolation.md) — what each context may execute
- [browser-server-boundaries.md](./browser-server-boundaries.md) — export-side split
- [deployment-targets.md](../../07-mobile-and-release/deployment-targets.md) — the release pipeline and its gates

## Change Impact

Adding a route, changing a page's rendering mode, or adding an import to a
`"use client"` module all touch this document's invariants.
