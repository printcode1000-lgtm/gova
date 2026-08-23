# Browser–Server Boundaries

## Purpose

Rules for splitting browser-safe and server-only code across `@asol/*` doors and application layers.

## Scope

Runtime split for main app and sealed packages. Native/Capacitor boundaries overlap — see [runtime-isolation.md](./runtime-isolation.md).

## Door conventions

| Door | Runtime | Guard |
|---|---|---|
| `@asol/<pkg>` (`.`) | Usually universal or browser-safe | Package defines |
| `@asol/<pkg>/server` | Node / serverless only | `import 'server-only'` at door file |
| `@asol/data-core/browser` | Client Components | No Node drivers |
| `@asol/ota-core/publishing` | CLI / release tooling | Must not ship to client bundle |
| `@asol/native-core` | Browser + native WebView | No Node; Capacitor allowed |

## Application rules

| Context | Allowed | Forbidden |
|---|---|---|
| Client Components (`'use client'`) | Browser doors, hooks, client services | `server-only`, DB drivers, `./server` doors |
| Server Components / route handlers | Server doors, server services | Client-only state hooks without boundary |
| `instrumentation.ts` | `registerAppServerPorts()` | Client registration |

Browser composition root (`browser-ports.ts`) is `'use client'`. Server root uses dynamic imports and `server-only`.

## Package examples

**`@asol/data-core`:** 33 doors — domain slices are server-oriented; `./browser` holds IndexedDB adapter. ESLint blocks `indexedDB` global outside approved adapter.

**`@asol/notifications-core`:** Client registration vs `./server` delivery providers.

**`@asol/observability-core`:** `.` for client config; `./server` for server monitor telemetry.

## Static export / Capacitor

Static bundle (`npm run build:static`) excludes server doors. Runtime context detects static export and native container — DB construction rejected in those modes (`test:runtime-context`).

Mobile release: [docs/07-mobile-and-release/](../../07-mobile-and-release/).

## Source Map

- Browser root: `src/core/composition/browser-ports.ts`
- Server root: `src/core/composition/server-ports.ts`
- OTA runtime ESLint: `eslint.config.js` `@asol/ota-core runtime sealing` section
- Data browser: `packages/data-core/src/browser/`

## Related Documents

- [Runtime Isolation](./runtime-isolation.md)
- [Package Exports](../02-packages/package-exports.md)
- [Application Layers](../10-application-layers/README.md)

## Change Impact

Importing `./server` from client code fails build. New server doors need explicit `server-only` guard.

## Invariants

1. Database drivers never ship to browser bundles.
2. Server port registration runs from `instrumentation.ts`, not client trees.
3. Publishing/tooling doors stay out of runtime client graphs.
