# @asol/storage-core

Centralized storage management package for ASOL.

## Features

- **Account Registry**: Single source of truth for Cloudflare R2 storage accounts (`general`, `products`). Extending with a new account or splitting an existing one is a data-only change via the registry and storage profiles.
- **Server/Browser Split**:
  - `@asol/storage-core`: Browser-safe runtime exports (profile types, image rules, path helpers). Zero Node builtins and zero `@aws-sdk` dependencies.
  - `@asol/storage-core/server`: Server-only exports (R2 object store, provider resolver, credentials, image processor).
- **Server Purity & Node Scripts**: Node scripts import `@asol/storage-core/server` without enforcing literal `server-only` react-server import locks.
- **Package Independence**: `@asol/storage-core` and `@asol/ota-core` have zero direct dependencies on each other. `ota-core` manages its own R2 storage account (`ota`).
- **CORS Payload Shape Isolation**: The Cloudflare CORS policy payload shape (`R2CorsPolicy` / `CloudflareCorsRule`) is deliberately defined locally within `@asol/storage-core` and duplicated in `@asol/ota-core`. This intentional duplication prevents creating a cross-package dependency edge between storage-core and ota-core while keeping both packages completely self-contained.
- **Unified R2 Adapter**: Single S3 client adapter in `src/adapters/s3-client.adapter.ts` eliminates legacy paired functions (`uploadR2Object`/`uploadProductR2Object`, etc.).

## Entry Points

- `@asol/storage-core` -> `src/index.ts`
- `@asol/storage-core/server` -> `src/server.ts`
