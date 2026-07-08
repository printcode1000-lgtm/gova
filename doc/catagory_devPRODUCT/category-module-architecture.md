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

Medical specialties are used by the User Specialties Module to query users by specialty via the `getDoctorAppointmentItems()` projection.

## Delivery Services

Record 46 exists once in the official source. It is included in the home page market, excluded from the product selector, and added directly to profile specialty options without a sublist. The module does not create an artificial copy of it.

Delivery services use the specialty column `delivery_services_46` in the user_specialties table.

## User Specialties Integration

The CategoryService provides specialty column mapping for the User Specialties Module:

- `getSpecialtyColumnItems()`: Returns items for mapping to database columns
- `getDoctorAppointmentItems()`: Returns medical specialty items for doctor-appointment mapping
- `getCollection(collectionId)`: Returns collection data for hierarchical specialty support

Column names follow the pattern: `{slug(titleEn)}_{originalId}`

The module supports hierarchical relationships where selecting a collection member automatically includes all its subcategories in the user specialties.

## Public API

`CategoryService` provides Typed projections for the home page, trees, collections, profile, developer selector, specialty columns, and random choices. It also provides `resolveSelection` and `resolveLegacyProductSelection` to verify parent-child relationships before saving products or their design settings.

The public API does not return Raw DTOs and does not contain `getAllForSpecialties`.

## Client/Server Boundary

The loader uses build-compatible JSON imports and does not depend on `fs` in the application runtime path. Therefore, interfaces can consume public projections without leaking Node file readers into the client bundle. Image existence checks remain in the validation script only.

Specialty column mapping has both server-only (`specialty-columns.server.ts`) and client-compatible (`specialty-columns.client.ts`) versions to support different rendering contexts.

## Validation and Tests

```bash
npm run category:validate
npm run test:categories
npm run architecture:check
npm run typecheck
```

The validation engine checks structure, duplicate IDs, parent relationship, composite `originalId`, collection metadata, required fields, and image paths. The architecture check prevents direct JSON access, raw fields, or module detail imports.
