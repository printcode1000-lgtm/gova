# Package Exports (Doors)

## Purpose

Define how declared `package.json` `exports` work as the sole legal import surface ("doors") for sealed packages. Agents MUST use doors — never deep paths.

## Scope

Export map rules for all `@asol/*` packages. Per-package door lists are in [package-catalog.md](../08-reference/package-catalog.md).

## Door model

Each key in `exports` is a public door. Importers use:

```typescript
import { … } from '@asol/data-core/product';
import { … } from '@asol/storage-core/server';
```

Forbidden:

```typescript
import { … } from '@asol/data-core/src/domains/product/…';  // deep
import { … } from '../../packages/data-core/src/…';           // relative into packages/
```

## Enforcement (four layers)

1. **Node resolution** — undeclared subpaths fail at build time when `exports` has no wildcard.
2. **ESLint `no-restricted-imports`** — patterns in `eslint.config.js` ban deep paths and vendor SDKs outside owners.
3. **`architecture:check`** — `checkPackageSealContract` walks `src/`, `packages/`, `scripts/`, `services/`.
4. **Package contract tests** — pin allowed export surface and reject new undeclared doors.

## Notable door shapes

### `@asol/data-core` — 33 doors

Largest export map. Categories:

| Category | Doors |
|---|---|
| Root + infrastructure | `.`, `./browser`, `./composition`, `./provisioning`, `./telemetry`, `./tooling`, `./runtime-config` |
| Domain server slices | `./auth`, `./product`, `./profile`, `./notifications`, `./ota`, `./super-admin`, … (18 domains) |
| Entity-only doors | `./auth/entities`, `./product/entities`, `./profile/entities`, … |

Re-measure: `node -e "console.log(Object.keys(require('./packages/data-core/package.json').exports).length)"`

Operational database detail: [docs/02-data-and-storage/](../../02-data-and-storage/).

### `@asol/page-save-core` — single door (enforced)

Exactly one export key: `"."`. `checkPageSaveGatewayContract` fails the build if a second door appears. Page-authored persistence MUST go through this gateway.

### `@asol/native-core` — four doors

`.`, `./platform-globals`, `./scripts/validate-android-r8-policy`, `./scripts/android-build-preflight`. ESLint explicitly allows these while banning `@asol/native-core/src/**`.

### `@asol/ota-core` — runtime vs publishing split

`.` and runtime paths MUST NOT import Node builtins (`fs`, `path`, `child_process`). `./publishing` and `./server` hold Node tooling. ESLint enforces the split in `eslint.config.js`.

### `@asol/orders-core` — single consumer door

ESLint: "The order domain has exactly one door. Import from `@asol/orders-core`, never a sub-path."

## Adding a new door

1. Add explicit entry to `package.json` `exports` with `types` and `default` pointing at the source file.
2. Update the package contract test to pin the new door.
3. Update [package-catalog.md](../08-reference/package-catalog.md).
4. Run `npm run architecture:check` and the package's `test:*-core`.

Never add `"./*"` wildcards or tsconfig `"@asol/<name>/*"` path aliases — they defeat layer 1 enforcement.

## Source Map

- ESLint patterns: `eslint.config.js` (sections for `data-core`, `native-core`, `ota-core`, `storage-core`)
- Seal check: `packages/architecture-core/src/checks/package-seal-contract.ts`
- Page-save single door: `packages/architecture-core/src/checks/page-save-gateway-contract.ts`

## Related Documents

- [Import Enforcement](../07-enforcement/import-enforcement.md)
- [Package Sealing](../07-enforcement/package-sealing.md)
- [Forbidden Dependencies](../03-dependencies/forbidden-dependencies.md)

## Change Impact

New doors change the public API contract. Downstream importers, service mirrors (`npm run services:sync`), and contract tests must be updated in the same change.

## Invariants

1. Every import of `@asol/*` resolves to a key in that package's `exports`.
2. Wildcard exports are forbidden across all sealed packages.
3. `page-save-core` MUST remain single-door.
