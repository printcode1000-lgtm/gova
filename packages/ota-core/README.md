# `@asol/ota-core`

Unified Over-The-Air (OTA) update and static build system for ASOL.

## Architectural Boundaries

This package provides two distinct sealed entrypoints:

1. **`@asol/ota-core` (Runtime Entry)**:
   - Safe for browser, Next.js client, and Next.js SSR execution.
   - Zero Node.js builtins (`node:*`, `fs`, `path`, `crypto`, `child_process`).
   - Zero backend dependencies (`@aws-sdk/*`, `google-auth-library`, `dotenv`).
   - Interacts with device platform purely through `@asol/native-core`.

2. **`@asol/ota-core/publishing` (Publishing / Build Entry)**:
   - Node-only pipeline and release automation.
   - Contains adapters for R2 storage, Google Play Console credentials, and filesystem.
   - Owns the single release gate `evaluateReleaseGate()`, version writers, and static out pipeline.

## Confirmation Requirements (§7)

- Uploading to R2 requires explicit `--confirm-upload` flag (`confirmUpload: true`).
- Writing native version numbers requires explicit `--confirm-version-write` flag (`confirmVersionWrite: true`).
- Pushing/creating `native-v*` tags requires explicit `--confirm-tag-push` flag (`confirmTagPush: true`).

## Local Refresh vs Release Publish (§8)

- **Local Refresh (TEST intent)**: Rebuilds `out` at the current content version without bumping numbers and without contacting or uploading to R2.
- **Publish (PUBLISH intent)**: Advances the counter strictly by one step on the current native line and publishes signed bundles to R2 with the manifest written last.

## Notice on CORS Payload Shape
The Cloudflare CORS policy payload shape is defined locally within `packages/ota-core` and duplicated in `@asol/storage-core`. This intentional duplication maintains complete zero-dependency package independence between `@asol/ota-core` and `@asol/storage-core`.

## Notice on `google-auth-library`
`google-auth-library` is strictly isolated within `packages/ota-core/src/publishing/adapters/google-play.adapter.ts`. The only permitted legacy exception repo-wide is `src/features/notifications/services/providers/fcm-http-v1.server.ts` for FCM push delivery.
