# Product Data Model

## Purpose

The Product Data Model defines how ASOL stores and exposes products across the UI, API, local SQLite, and Turso.

Products are first-class structured records. They must not be stored as generic JSON documents or accessed through `product.data.fields`.

## Core Rule

Product properties are stored in explicit database columns.

Forbidden for product properties:

- `products.data_json`
- `product.data.fields`
- Generic field bags for saved product values

Allowed exception:

- `images_json`, because product images are a naturally variable-length list.

## Runtime Object Shape

The UI and API use a grouped product object:

```ts
ProductRecord {
  id: string;
  uid: string;
  mainCategoryId: string;
  subcategoryId: string;
  status: "draft" | "active" | "archived";
  createdAt: string;
  updatedAt: string;
  mainData: ProductMainData;
  price: ProductPriceData;
  specifications: ProductSpecificationsData;
  vehicleSpecs: ProductVehicleSpecsData;
  propertySpecs: ProductPropertySpecsData;
  pharmacyCatalog: ProductPharmacyCatalogData;
  pharmacySpecs: ProductPharmacySpecsData;
  rating: ProductRatingData;
  images: StoredImage[];
}
```

The canonical TypeScript definition lives in:

```text
src/features/product/entities/product.entity.ts
```

## Database Storage

The product database schema is defined in:

```text
src/core/database/product/product.schema.ts
```

The base migration is:

```text
src/core/database/product/migrations/0000_products.sql
```

The `products` table stores grouped product sections as explicit columns:

- Category identity: `main_category_id`, `subcategory_id`
- Main data: `main_name`, `main_brand`, `main_manufacturer`, `main_available`, `main_description`
- Price: `price_current`, `price_before_discount`, `price_label`, `price_needs_car`
- General specifications: `spec_color`, `spec_dimensions`, `spec_condition`, `spec_size`, `spec_weight`, `spec_year`
- Vehicle specifications: `vehicle_brand`, `vehicle_body_type`, `vehicle_fuel`, `vehicle_transmission`, `vehicle_special`
- Property specifications: `property_area`, `property_rooms`, `property_bathrooms`, `property_type`, `property_address`, `property_latitude`, `property_longitude`, `property_finishing`
- Pharmacy catalog: `pharmacy_catalog_*`
- Pharmacy specifications: `pharmacy_*`
- Rating settings: `rating_value`, `rating_comment`, `rating_enabled`, `rating_target_enabled`, `rating_mode`
- Images: `images_json`

## API Contract

`/api/products` accepts and returns the same grouped product shape.

Create payload:

```ts
CreateProductInput extends ProductDetails {
  uid: string;
  mainCategoryId: string;
  subcategoryId: string;
  status?: ProductStatus;
}
```

Update payload:

```ts
UpdateProductInput extends ProductDetails {
  id: string;
  uid: string;
  status?: ProductStatus;
}
```

There is no nested `data` object in product create/update payloads.

## Repository Responsibility

`ProductRepository` is the only layer that maps between:

- Database column names
- The grouped `ProductRecord` object

Location:

```text
src/features/product/repositories/product-repository.ts
```

UI, hooks, client services, and server services must consume the typed grouped object. They must not know database column names.

## Product Page Responsibility

The product page works with `ProductDetails` as its local editing state.

Location:

```text
src/components/product/ProductPageContent.tsx
src/components/product/ProductComponentsRenderer.tsx
```

Product style controls component visibility and ordering only. It does not change the database model.

## Pharmacy Products

The pharmacy catalog module maps fixed pharmacy data into regular `ProductRecord` objects.

Fixed products and custom pharmacy products expose:

- `mainData`
- `price`
- `pharmacyCatalog`
- `pharmacySpecs`
- `images`

Seller-specific pharmacy edits are stored in override tables, then projected back into the same product object shape.

See [Pharmacy Profile Catalog](../componant/pharmacy-profile-catalog.md).

## Image Storage

The image storage system returns `StoredImage` objects:

```ts
type StoredImage = {
  imageKey: string;
  url: string;
};
```

Product images are saved in `products.images_json` as a list of these objects.

The storage component does not write to the product database. Product persistence remains the responsibility of the product feature.

## Local and Cloud Compatibility

Development uses:

```text
public/sync_data/sync_sqlite/product.db
```

Production uses the configured product Turso database:

```text
TURSO_PRODUCT_DATABASE_URL
TURSO_PRODUCT_AUTH_TOKEN
```

The local SQLite schema is the source of truth. `npm run db:schema:sync` syncs schema changes to Turso.

## Migration Policy

Product schema changes must update:

1. `src/core/database/product/product.schema.ts`
2. `src/core/database/product/migrations`
3. `ProductRecord` and related entity types
4. `ProductRepository` column mapping
5. This document

Product properties should be added as explicit columns. Do not reintroduce `data_json` for product attributes.

## Security and Maintainability

Explicit columns make product data:

- Searchable
- Filterable
- Easier to validate
- Easier to migrate
- Safer for API contracts
- Clearer for UI components

Generic JSON is avoided because it hides schema drift, makes validation weaker, and encourages UI code to depend on stringly typed field keys.
