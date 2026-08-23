# Import Enforcement

## Purpose

Catalog ESLint and architecture-scan import rules agents encounter daily.

## Scope

`eslint.config.js` patterns and scan import analysis. Full forbidden list: [forbidden-dependencies.md](../03-dependencies/forbidden-dependencies.md).

## ESLint structure

| Block | Files | Focus |
|---|---|---|
| Global | `**/*.{ts,tsx,js,jsx}` | Next.js recommended, localStorage ban |
| Data access | `src/**`, `scripts/**` (except architecture-check) | DB drivers, data-core deep paths, orders-core subpaths |
| Native sealing | `src/**`, `services/**`, `scripts/**`, `packages/**` | Capacitor ban, native-core deep paths, composition seals, OTA legacy |
| OTA runtime | `packages/ota-core/src/domain/**`, runtime, index | Node builtin ban |
| Additional blocks | package-specific | storage, notifications, touch policy via scan |

`scripts/architecture-check.ts` is ignored where it would flag its own enforcement strings.

## Key patterns (from eslint.config.js)

### Database — owner `@asol/data-core`

```javascript
{ name: 'better-sqlite3', message: 'Database drivers belong to @asol/data-core only.' }
{ group: ['@libsql/*', 'drizzle-orm/*'], ... }
{ group: ['@asol/data-core/src/**', '**/packages/data-core/**'], ... }
```

### Capacitor — owner `@asol/native-core`

```javascript
{ group: ['@capacitor/*', '@capawesome/*', '@capgo/*', '@capacitor-mlkit/*'], ... }
```

Ignores: `packages/native-core/**`, `capacitor.config.ts`, `architecture-core/**`.

### Legacy OTA paths

```javascript
{ group: ['@/features/ota/**', 'scripts/ota/**', ...], message: '... @asol/ota-core ...' }
```

### Globals

Client code: `indexedDB` and `localStorage` banned — use `@asol/data-core/browser` and approved preferences.

## Scan enforcement (beyond ESLint)

`checkVendorOwnershipContract` — any owned vendor in any scanned file  
`checkPackageAppImportContract` — `@/` in packages with `mayImportApp: false`  
`checkPackageSealContract` — deep paths and relative packages traversal

## Developer workflow

```bash
npm run lint          # ESLint only — fast
npm run architecture:check   # full scan
```

Both run in `npm run build`.

## Source Map

- `eslint.config.js`
- Import extraction: `packages/architecture-core/src/checks/architecture-types.ts`

## Related Documents

- [Forbidden Dependencies](../03-dependencies/forbidden-dependencies.md)
- [Package Sealing](./package-sealing.md)
- [Bypass Prevention](../05-capability-enforcement/bypass-prevention.md)

## Change Impact

New ESLint pattern requires justification in architecture-core — avoid duplicating scan logic without reason.

## Invariants

1. ESLint and scan overlap intentionally — neither alone is sufficient.
2. No `eslint-disable` for restricted-imports without ADR.
3. Capacitor imports outside native-core always error.
