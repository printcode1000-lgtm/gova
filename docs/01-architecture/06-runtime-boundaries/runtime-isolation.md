# Runtime Isolation

## Purpose

Define execution contexts (browser, Node server, static export, native WebView, CLI scripts) and which capabilities may run in each.

## Scope

Runtime context detection and isolation policies. Deployment targets: [docs/07-mobile-and-release/](../../07-mobile-and-release/).

## Execution contexts

| Context | Detection | DB | R2 write | Capacitor | Push send |
|---|---|---|---|---|---|
| Next dev/server | Node server | SQLite/Turso via data-core | Yes (server) | No | Yes (server) |
| Vercel serverless | Node | Turso | Yes | No | Yes |
| Browser (hosted) | Client bundle | IndexedDB via data-core/browser | Presign read | No | Register only |
| Static export / OTA | `output: 'export'` | No direct DB | Via remote API | Via native-core | Native path |
| Native WebView | Capacitor | Via API + local stores | Via API | Yes | Yes |
| CLI scripts | `scripts/*.ts` | Via data-core tooling doors only | Via storage-core | No | Tooling only |

## Runtime context module

Application runtime facts (development, static export, native shell) flow through `@/core/config` and dedicated runtime-context tests — not ad-hoc `process.env` reads in features.

`configureObservabilityCore({ isDevelopment })` receives runtime from composition roots so packages do not self-detect environment incorrectly.

## Native isolation

`@asol/account-bridge` runs **device-side only** — cross-account bridging never on server.

`@asol/native-core` centralizes Capacitor so platform upgrades touch one package (rule 9).

## Service runtime isolation

Each `services/*/` deployment is a separate Next.js project with its own env and import graph. A service MUST NOT import capabilities its account credentials do not support — enforced by composition task absence tests.

`@asol/service-runtime-core` shares HTTP/error helpers without sharing application policy.

## Script isolation

`scripts/architecture-check.ts` is exempt from some ESLint rules (quotes enforcement patterns). Other scripts:

- MUST NOT import database drivers directly
- MUST use `@asol/*` tooling doors for DB maintenance

## Source Map

- Runtime tests: `npm run test:runtime-context`
- Native policy: `packages/architecture-core/src/checks/native-contract.ts`
- Database runtime policy: `packages/data-core/src/core/database-runtime-policy.test.ts`

## Related Documents

- [Browser–Server Boundaries](./browser-server-boundaries.md)
- [Service Boundaries](./service-boundaries.md)
- [Infrastructure Ownership](../05-capability-enforcement/infrastructure-ownership.md)

## Change Impact

Code assuming Node APIs in client bundles fails `next build`. Test runtime context when adding environment-sensitive logic.

## Invariants

1. DB drivers never execute in browser/static/native client paths.
2. Account-bridge never runs server-side.
3. Each service deployment's runtime matches its account credentials.
