# Sealed Packages & Mandatory Gateways

## Package Layers (41 Packages)
1. **Capability (`*-core`, 33 pkgs)**: Core domain logic & infrastructure isolation (e.g., `data-core`, `native-core`, `storage-core`, `notifications-core`, `auth-core`, `ota-core`, etc.). Never import `@/`.
2. **Composition (`*-composition`, 6 pkgs)**: Compose app and services for deployment targets (`notifications`, `orders`, `products`, `profiles`, `submain`, `sub2main`). Only packages allowed with `mayImportApp: true`.
3. **Declarations (`account-declarations`, 1 pkg)**: Pure data definitions for deployment accounts; imports nothing.
4. **Bridge (`account-bridge`, 1 pkg)**: Device/browser-side identity and cross-account routing.
5. **Enforcement (`architecture-core`, 1 pkg)**: Static AST analysis, registry schemas, `architecture:check` runner.

## Mandatory Gateways
- **Database Access**: `@asol/data-core` (exclusive owner of `better-sqlite3`, `@libsql/client`, `drizzle-orm`).
- **Object Storage (R2/S3)**: `@asol/storage-core` (exclusive owner of `@aws-sdk/client-s3`).
- **Capacitor / Native**: `@asol/native-core` (exclusive owner of `@capacitor/*`, `@capawesome/*`, `@capgo/*`).
- **Page Writes**: `@asol/page-save-core` (single-door gateway for user page edits).
- **Push Delivery**: `@asol/notifications-core` (Web Push, FCM HTTP v1, APNs).
- **OTA Updates**: `@asol/ota-core` (OTA updates, update bundles, release signing).

## Composition Roots & Ports
- `src/core/composition/browser-ports.ts`: Wires browser-side adapters (OTA, account-bridge, data-core browser, page-save, etc.).
- `src/core/composition/server-ports.ts`: Wires server-side adapters (storage, database, orders, notifications, etc.).
- All ports verified by `src/core/composition/tests/ports-registry.test.ts`.
