# `@asol/product-core` Architecture

## Summary

`@asol/product-core` is the sealed package for the product domain model: typed product
sections, normalization before persistence, and database row mapping.

## Public surface

| Door | Import | Contents |
| :--- | :--- | :--- |
| Browser / shared | `@asol/product-core` | Entities, `createEmptyProductDetails`, `normalizeProductDetails`, ID helpers |
| Server | `@asol/product-core/server` | `PRODUCT_COLUMNS`, `mapProductRow`, `productRowValues`, `mergeProductRecord` |

## What moved into the package

| Old location | Replacement |
| :--- | :--- |
| `src/features/product/domain/product.entity.ts` (logic) | `@asol/product-core` |
| `normalizeDetails` in `product-service.server.ts` | `normalizeProductDetails` |
| Row mapping in `product-repository.ts` | `@asol/product-core/server` |

`src/features/product/domain/product.entity.ts` remains a thin re-export shim.

## What stays in the app

- `ProductService` orchestration (storage URLs, pharmacy catalog, category validation)
- `ProductRepository` SQL execution and profile count refresh
- UI: `ProductPageContent`, `ProductComponentsRenderer`, dev selector

## Tests

```bash
npm run test:product-core
```

Gated by `test`, `build`, and `build:static`.
