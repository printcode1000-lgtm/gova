# Runtime Context

## Purpose

Preserved operational and architectural detail from `docs/01-architecture-backup/`. Agents use this for implementation guidance.

## Scope

See sections below. Architectural relationships defer to [docs/01-architecture/README.md](../README.md) where applicable.

---

`src/core/config/runtime-context.ts` is the single model for deciding how ASOL is running. It prevents individual features from inferring the environment from URLs, user agents, or scattered environment-variable checks.

## Context shape

```ts
{
  deployment: "local-development" | "web-production" | "static-export",
  platform: "web" | "android" | "ios",
  dataSource: "local" | "cloud",
  isDevelopment: boolean,
  isNative: boolean,
  isStatic: boolean,
  isProvisioning: boolean,
  supportsServerApi: boolean,
  supportsOta: boolean,
}
```

## Modules

| Module | Use | Responsibility |
|---|---|---|
| `runtime-context.ts` | Shared model | Types and pure server-context resolver |
| `runtime-context.server.ts` | Server and build scripts | Reads runtime variables and exposes `getServerRuntimeContext()` |
| `runtime-context.client.ts` | Client components and browser adapters | Reads public build values and detects Capacitor platform |

Do not import the server module into a browser-only feature. Do not read `process.env` outside the configuration layer.

## Supported environments

| Runtime | Deployment | Platform | Data source | Server API | OTA |
|---|---|---|---|---|---|
| Local development | `local-development` | `web` | `local` by default | Yes | No |
| Hosted web | `web-production` | `web` | `cloud` | Yes | No |
| Static web `out/` | `static-export` | `web` | `cloud` | Configured remote API only | No |
| Android | `static-export` | `android` | `cloud` | Configured remote API only | Yes when configured |
| iOS | `static-export` | `ios` | `cloud` | Configured remote API only | Yes when configured |

Android and iOS use the same static web bundle. Capacitor distinguishes the native platform at runtime.

## Resolution rules

`getServerRuntimeContext()` derives server context from `NODE_ENV`, `ASOL_MODE`, `NEXT_PUBLIC_ASOL_MODE`, `VERCEL`, `VERCEL_ENV`, `ASOL_DATA_SOURCE`, `ASOL_PROVISIONING`, and `GITHUB_ACTIONS`.

- `ASOL_MODE=static` selects `static-export`.
- Vercel selects `web-production`.
- `ASOL_DATA_SOURCE=local` enables local data only outside static, hosted, and provisioning contexts.
- `ASOL_DATA_SOURCE=cloud` forces cloud data access during local execution.
- Native behavior is determined by Capacitor in `getClientRuntimeContext()`.
- OTA requires a native platform plus a public manifest URL and public key.

## Rules

- Server storage and database providers use the server context.
- Native-only behavior uses `isNative` and `platform` from the client context.
- Static bundles never instantiate a local server database.
- New environment behavior requires a test in `scripts/test-runtime-context.ts`.

## Verification

```bash
npm run test:runtime-context
npm run typecheck
npm run architecture:check
```
