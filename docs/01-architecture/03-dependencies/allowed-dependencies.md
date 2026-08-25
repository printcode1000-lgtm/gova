# Allowed Dependencies

## Purpose

Positive allowlist patterns for imports. When an import matches an allowed pattern here, it is architecturally legal — subject to runtime boundary rules.

## Scope

Common allowed dependency patterns. Exhaustive inter-package edges: [dependency-map.md](../08-reference/dependency-map.md).

## Application → package (allowed)

Application code MAY import any declared door of any sealed package:

```typescript
import { … } from '@asol/data-core/product';
import { … } from '@asol/storage-core/server';
import { … } from '@asol/native-core';
import { … } from '@asol/page-save-core';
```

Application wiring modules (`src/features/**/*-ports.ts`, `src/core/composition/*-ports.ts`) MAY implement ports defined by packages.

## Package → package (allowed patterns)

| Pattern | Example | Notes |
|---|---|---|
| Leaf capability → nothing | `orders-core`, `format-core`, `secrets-core` | Zero `@asol/*` edges |
| Data hub | `data-core` → many `*-core` | Central DB owner composes domains |
| Native consumer | `map-core` → `native-core` | Platform APIs through owner |
| Storage consumer | `backup-core` → `storage-core/server` | R2 via port, not direct SDK |
| Auth token | `auth-core` → `signed-token-core` | Shared envelope algorithm |
| Observability | `observability-core` → `data-core/browser`, `./telemetry` | Browser telemetry path |
| Release | `release-core` → `vercel-deploy-core`, `ota-core/publishing`, `env-core/process` | Console orchestration and shared release-tool env load |
| OTA tooling | `ota-core` → `env-core/process` | Same release-tool env loader as the console |
| Deploy metadata | `vercel-deploy-core` → `account-declarations` | Safe: declarations import nothing |
| Composition → declarations | `orders-composition` → `account-declarations/orders` | Per-account door only |
| Composition → capability | `notifications-composition` → `notifications-core` | Wiring delivery |
| Composition → app | `*-composition` → `@/features/*`, `@/core/*` | `mayImportApp: true` |
| Bridge → native | `account-bridge` → `native-core`, `branding-core` | Device-side only |
| Enforcement → OTA report | `architecture-core` → `ota-core/publishing` | Native surface report only |

## Vendor SDK (allowed only in owner)

| Module | Owner package(s) |
|---|---|
| `drizzle-orm`, `better-sqlite3`, `@libsql/client` | `@asol/data-core` |
| `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` | `@asol/storage-core` |
| `@aws-sdk/client-s3` (OTA artifacts) | `@asol/ota-core` |
| `@capacitor/*`, `@capawesome/*`, `@capgo/*`, `@capacitor-mlkit/*` | `@asol/native-core` |
| `web-push`, `google-auth-library` | `@asol/notifications-core` |
| `maplibre-gl` | `@asol/map-core` |
| `sharp` | `@asol/branding-core` |
| `google-auth-library` (Play/FCM dual use) | `@asol/ota-core`, `@asol/notifications-core` |

Full list: `OWNED_VENDOR_MODULES` in `capability-registry.ts`.

## Application layer (allowed downward)

| Layer | May import |
|---|---|
| UI | Hooks, shared components, `@asol/*` browser-safe doors |
| Hooks | Client services |
| Client services | `asolApi` from `src/core/api/asol-api-client.ts` (application transport, not an `@asol/*` package) |
| Business API bootstrap | Server service factories |
| Server services | Query/command layer |
| Query/command | Repository interfaces |
| Repository | `@asol/data-core` database client, Drizzle types in allowed zones |

## Source Map

- Measured edges: [dependency-map.md](../08-reference/dependency-map.md)
- Registry: `packages/architecture-core/src/registry/capability-registry.ts`

## Related Documents

- [Forbidden Dependencies](./forbidden-dependencies.md)
- [Dependency Rules](./dependency-rules.md)

## Change Impact

New allowed edges should be added to dependency-map and verified with `npm run architecture:check`.

## Invariants

1. Every allowed vendor import has a registry `vendorModules` entry.
2. Composition → `@/` is allowed; reverse is not.
3. Declarations remain import-free.
