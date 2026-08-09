# Category Module Architecture

## Architectural Contract

`src/features/categories` is the sole runtime owner of the core category datasets. No component,
service, or repository may import the core JSON directly. The only public import allowed is:

```ts
import { categoryService, type CategoryDisplay } from "@/features/categories";
```

The official source files are:

- `public/catagory/core/categories.json`
- `public/catagory/core/subcategories.json`
- `public/catagory/core/collections.json`
- `public/catagory/core/specialty-columns.json`

`public/catagory/manifest.json` declares every dataset and asset root. JSON Schema 2020-12
contracts live under `public/catagory/schemas`. The name `catagory` remains for compatibility
with existing static bundles and OTA. There is no second data copy under `src/data`.

## Data Path

```text
versioned canonical JSON (schemaVersion 3)
  -> infrastructure/catalog-data.loader.ts
  -> normalized domain Category / Subcategory / Collection
  -> domain Category / Subcategory
  -> CategoryService projections
  -> application consumers
```

All canonical fields use camelCase. Localized names use `{ ar, en, ...futureLocales }`. Collection
membership and specialty-column mappings are explicit relationships rather than duplicated or
derived metadata.

Every category, collection and subcategory has `display.order` and `display.hidden`. The service
applies the shared display policy before producing Home, route, profile, developer-selector,
specialty or random-item projections. A hidden parent makes its descendants unavailable without
deleting their rows or relationships.

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

Home navigation treats Delivery Services as a direct providers entry. The Home category card uses `CATEGORY_CONSTANTS.DELIVERY_SERVICES_ID` and routes to `/categories/46/sellers/1` instead of `/categories/46`, so users land immediately on delivery service providers.

## User Specialties Integration

The CategoryService provides specialty column mapping for the User Specialties Module:

- `getSpecialtyColumnItems()`: Returns items for mapping to database columns
- `getDoctorAppointmentItems()`: Returns medical specialty items for doctor-appointment mapping
- `getCollection(collectionId)`: Returns collection data for hierarchical specialty support

Column names are stored explicitly in `core/specialty-columns.json`; changing a display title can
never silently rename a database column.

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

`npm run catalog:validate` validates every JSON Schema, ID, parent relation, collection member,
pharmacy reference, vehicle option/image, and the exact mapping to `profile-core.user_specialties`.
The category validator additionally checks category display images and required virtual-group rules.
The architecture check prevents direct core JSON access or module-detail imports.
