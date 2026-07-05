# Category Module Architecture

## Architectural Contract

`src/features/categories` is the sole owner of category data. No component, service, or repository may read or import `categories.json` or `subcategories.json` directly. The only public import allowed is:

```ts
import { categoryService, type CategoryDisplay } from "@/features/categories";
```

The official source files are:

- `public/catagory/categories.json`
- `public/catagory/subcategories.json`

The name `catagory` remains temporary for compatibility with existing static bundles and OTA. There is no second data copy under `src/data`.

## Data Path

```text
canonical JSON
  -> infrastructure/raw-data.loader.ts
  -> RawCategory / RawSubcategory
  -> runtime validation
  -> mapRawCategory / mapRawSubcategory
  -> domain Category / Subcategory
  -> CategoryService projections
  -> application consumers
```

snake_case fields are confined to `infrastructure`. Everything exiting the module uses camelCase and explicit types.

## Identity

- Category: `category:<id>`
- Collection: `collection:<id>`
- Collection member: `collection-member:<collectionId>:<id>`
- Subcategory: `subcategory:<categoryId>:<originalId>`
- Virtual collection: `virtual:doctor-appointment`

The `originalId` number is unique only within the parent category, not globally. Collection identity is independent of category identity even if the numbers are equal.

## Doctor Appointment

It is a virtual display node that cannot be saved or used to create a product. Opening it shows the real medical items whose `subCollection` value is zero. What is saved is the real `originalId` of each specialty. The module does not use negative IDs.

## Delivery Services

Record 46 exists once in the official source. It is excluded from the home page market and product selector, and added directly to profile specialty options without a sublist. The module does not create an artificial copy of it.

## Public API

`CategoryService` provides Typed projections for the home page, trees, collections, profile, developer selector, specialty columns, and random choices. It also provides `resolveSelection` and `resolveLegacyProductSelection` to verify parent-child relationships before saving products or their design settings.

The public API does not return Raw DTOs and does not contain `getAllForSpecialties`.

## Client/Server Boundary

The loader uses build-compatible JSON imports and does not depend on `fs` in the application runtime path. Therefore, interfaces can consume public projections without leaking Node file readers into the client bundle. Image existence checks remain in the validation script only.

## Validation and Tests

```bash
npm run category:validate
npm run test:categories
npm run architecture:check
npm run typecheck
```

The validation engine checks structure, duplicate IDs, parent relationship, composite `originalId`, collection metadata, required fields, and image paths. The architecture check prevents direct JSON access, raw fields, or module detail imports.
