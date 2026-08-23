# Package Sealing

## Purpose

Explain how sealed packages are mechanically closed — export maps, registry entries, and scan contracts.

## Scope

Sealing model for all 41 `@asol/*` packages. Per-package doors: [package-catalog.md](../08-reference/package-catalog.md).

## Seal components

| Component | Role |
|---|---|
| `package.json` `exports` | Authoritative door list — no wildcards |
| `CAPABILITY_PACKAGES` entry | Ownership, layer, vendorModules, mayImportApp |
| `checkPackageSealContract` | Rejects deep imports and relative `packages/` traversal |
| Package contract test | Pins doors and internal shape |
| ESLint patterns | Fast feedback for high-risk packages |

## Seal contract behavior

For each import in scanned files, the seal check verifies:

1. `@asol/<pkg>/...` resolves to a key in that package's `exports`
2. No relative path reaches into `packages/<other>/src/`
3. No `@asol/<pkg>/src/...` deep paths

Exemptions: explicitly ignored paths (e.g. architecture-core contract files quoting patterns).

## Special seals

| Package | Special rule |
|---|---|
| `page-save-core` | Exactly one export key `.` |
| `orders-core` | ESLint single-door |
| `native-core` | Capacitor vendor ban + limited doors |
| `ota-core` | Runtime vs publishing import split |
| `account-declarations` | Must import nothing |

## tsconfig anti-pattern

Never add `"@asol/<name>/*": ["packages/<name>/src/*"]` — bypasses export maps. Removed from native-core after it defeated sealing.

## Unsealed = fail

Folder under `packages/` without registry entry fails `checkCapabilityOwnershipContract`. Adding a folder without full seal is worse than no folder.

## Source Map

- Seal check: `packages/architecture-core/src/checks/package-seal-contract.ts`
- Ownership: `packages/architecture-core/src/checks/capability-ownership-contract.ts`
- Registry: `packages/architecture-core/src/registry/capability-registry.ts`

## Related Documents

- [Package Exports](../02-packages/package-exports.md)
- [Architecture Check](./architecture-check.md)
- [Import Enforcement](./import-enforcement.md)

## Change Impact

New door = export map + contract test update. Removing a door is breaking — migrate importers first.

## Invariants

1. No wildcard exports in any sealed package.
2. Registry and disk folders stay in 1:1 correspondence.
3. Seal check covers `src/`, `packages/`, `scripts/`, `services/`.
