# `@asol/catalog-core` Architecture & Consolidation

## 1. Summary & Core Mission

`@asol/catalog-core` is the sealed workspace package for Catalog v3: shared types, Zod contracts,
display visibility rules, and the full-tree validator used by CI and Catalog Studio.

Located at `packages/catalog-core/`, it replaces logic that previously lived in
`@asol/catalog-core/` and `scripts/validate-catalog.ts`. Runtime category projections and
Catalog Studio editing remain in `src/features/`.

---

## 2. Package Boundaries & Public Surface

| Door | Import | Safe for | Contents |
| :--- | :--- | :--- | :--- |
| Browser / shared | `@asol/catalog-core` | Client, hooks, services, scripts using schemas only | Types, Zod schemas, `isCatalogItemVisible`, `visibleCatalogItems` |
| Server | `@asol/catalog-core/server` | Node scripts, Catalog Studio validator child process | `validateCatalogV3`, `resolveCatalogRoots` |

**Do not** deep-import from `packages/catalog-core/src/**`. Use only the two doors above.

---

## 3. What Moved Into the Package

| Old location | Replacement |
| :--- | :--- |
| `@asol/catalog-core/types/catalog-v3.types.ts` | `@asol/catalog-core` |
| `@asol/catalog-core/contracts/catalog-v3.contract.ts` | `@asol/catalog-core` |
| `@asol/catalog-core/utils/catalog-display.ts` | `@asol/catalog-core` |
| `scripts/validate-catalog.ts` (validation body) | `validateCatalogV3` in `@asol/catalog-core/server` |

`@asol/catalog-core/` remains as a **thin re-export shim** so existing `@/features/catalog-data`
imports keep working.

---

## 4. Validation Model

`validateCatalogV3({ catalogRoot, publicRoot, expectedDatabaseColumns? })` returns
`{ errors, warnings, summary }`.

- **Cross-file checks** (IDs, assets, specialty mappings, pharmacy/vehicle relations, JSON Schema
  freshness) always run inside the package.
- **`expectedDatabaseColumns`** is optional. When provided, the validator asserts a bijection between
  `specialty-columns.json` mappings and Drizzle `user_specialties` columns. The app script
  `scripts/validate-catalog.ts` reads the schema file and passes the column set — keeping DB schema
  ownership in `data-access` while validation logic stays sealed.

Environment overrides (unchanged):

- `ASOL_CATALOG_ROOT` — catalog tree root (default: `public/catagory`)
- `ASOL_CATALOG_PUBLIC_ROOT` — public assets root (default: `public`)

---

## 5. App Integration Map

```
packages/catalog-core/
  src/index.ts
  src/server.ts
  src/server/validate-catalog-v3.ts
  src/tests/index.test.ts

public/catagory/**          → static Catalog v3 data
scripts/validate-catalog.ts → thin CLI wrapper
@asol/catalog-core/  → re-export shim
src/features/categories/    → categoryService + loader
src/features/catalog-studio/ → dev editor (spawns validate-catalog.ts)
```

---

## 6. Tests & Build Gate

```bash
npm run test:catalog-core
npm run catalog:validate
```

`test:catalog-core` is included in `npm run test`, `npm run build`, and `npm run build:static`.

---

## Related

- [catalog-v3-data-contract.md](../../03-products-and-commerce/categories-and-products/catalog-v3-data-contract.md)
- [catalog-studio.md](../../06-super-admin-and-operations/catalog-studio.md)
- [module-isolation-rules.md](../../01-architecture/02-packages/module-isolation-rules.md)
