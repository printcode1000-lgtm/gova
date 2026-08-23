# Package Naming

## Purpose

Naming conventions for sealed packages so agents, registry entries, npm scripts, and documentation stay aligned.

## Scope

All packages under `packages/` with `@asol/*` names. Application modules under `src/` follow feature naming — not covered here.

## Conventions

| Pattern | Example | When to use |
|---|---|---|
| `@asol/<domain>-core` | `@asol/orders-core` | Capability owner for domain or infrastructure |
| `@asol/<account>-composition` | `@asol/orders-composition` | Per-account composition root |
| `@asol/account-declarations` | — | Shared declarations package (not `*-core`) |
| `@asol/account-bridge` | — | Device bridge (not `*-core`) |
| `@asol/architecture-core` | — | Enforcement layer |

### Folder name

The directory under `packages/` MUST match the npm name suffix:

```text
packages/orders-core/     →  @asol/orders-core
packages/ota-core/        →  @asol/ota-core
```

### Multi-word domains

Use kebab-case throughout: `data-health-core`, `google-play-store-assets-core`, `storage-image-manager-core`.

### Composition suffix

Deployment account compositions ALWAYS end in `-composition`, never `-core`:

```text
@asol/products-composition   ✅
@asol/products-core          ❌ (domain capability, different role)
```

## Test script naming

Root `package.json` scripts follow `test:<folder-with-hyphens>`:

| Package | Script |
|---|---|
| `@asol/data-core` | `npm run test:data-core` |
| `@asol/notifications-composition` | `npm run test:compositions` (collective) |
| `@asol/account-declarations` | `npm run test:account-declarations` |

Compositions share `test:compositions`; do not add individual `test:*-composition` scripts.

## Export door naming

Doors in `package.json` `exports` use relative subpaths:

| Door | Typical content |
|---|---|
| `.` | Browser-safe or universal entry |
| `./server` | Node/server-only surface (`server-only` guard) |
| `./browser` | Browser-only adapters (e.g. `@asol/data-core/browser`) |
| `./publishing` | Tooling/release half isolated from runtime (e.g. `@asol/ota-core/publishing`) |
| `./<domain>` | Domain slice (e.g. `@asol/data-core/product`) |

Never use wildcards (`"./*"`) or TypeScript path aliases (`"@asol/foo/*"` in tsconfig).

## Source Map

- Registry folder/name pairs: `packages/architecture-core/src/registry/capability-registry.ts`
- Script inventory: root `package.json` `scripts`

## Related Documents

- [Package Creation Rules](./package-creation-rules.md)
- [Package Exports](./package-exports.md)

## Change Impact

Renaming a package requires: folder rename, all import sites, registry entry, `package.json` name, test scripts, service mirror sync, and reference doc updates.

## Invariants

1. Every `@asol/*` name in the registry has a matching `packages/<folder>/` directory.
2. No two packages share a folder or npm name.
3. New capability packages use the `-core` suffix unless they are composition, declarations, or bridge.
