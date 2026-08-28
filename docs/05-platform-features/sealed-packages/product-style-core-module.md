# `@asol/product-style-core` Architecture

## Summary

`@asol/product-style-core` is the sealed package for Product Style: per-category layout
configuration (component visibility, order, and search columns) used by
`/dev/category-selector`, `/product?mode`, and product search.

## Public surface

| Door | Import | Contents |
| :--- | :--- | :--- |
| Browser / shared | `@asol/product-style-core` | Types, defaults, `normalizeProductStyleComponents`, validation helpers |
| Server | `@asol/product-style-core/server` | JSON read/write, index rebuild, search-column resolution |

## What moved into the package

| Old location | Replacement |
| :--- | :--- |
| `src/shared/ui/product-style-settings/*` | `@asol/product-style-core` |
| Validation + filesystem logic in `api/dev/product-style/route.ts` | `@asol/product-style-core/server` |
| Duplicate search-column defaults in `product-search-fields.server.ts` | `filterSearchFieldsByStyle` |

`src/shared/ui/product-style-settings.ts` remains a thin re-export shim.

## App integration

- `DeveloperCategorySelector` and style editors import the browser door.
- The rating editor's on/off control is the shared `ToggleSwitch`, wired exactly
  as the fulfillment return-policy switch is: the state label sits beside the
  switch and the switch carries it as its `aria-label`. Every on/off control in
  the application is that one touch-sized pill, per the
  [Touch Interaction Policy](../../04-ui-components/touch-interaction-policy.md).
- `api/dev/product-style/route.ts` is a thin dev-only wrapper around the server door.
- `product-search-fields.server.ts` reads normalized components through the server door.
- Static files stay in `public/product/style/`; the package owns read/write contracts only.

## Tests

```bash
npm run test:product-style-core
```

Gated by `test`, `build`, and `build:static`.
