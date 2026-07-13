# Pharmacy Profile Catalog

## Purpose

The Pharmacy Profile Catalog module turns the fixed pharmacy dataset into a ready-to-use pharmacy storefront for every user who selects:

- Main category: Medical Services (`20`)
- Subcategory: Pharmacies (`204`)

Every fixed active ingredient is treated as an orderable product, even when price, activation, or extra seller data is missing.

## Source Data

The default catalog is read from the pharmacy category dataset:

- `public/catagory/pharmacy/pharmacy_categories.json`
- `public/catagory/pharmacy/pharmacy_subcategories.json`
- `public/catagory/pharmacy/active_ingredients.json`
- `public/catagory/pharmacy/forms.json`
- `public/catagory/pharmacy/strengths.json`
- `public/catagory/pharmacy/active_ingredient_forms.json`
- `public/catagory/pharmacy/active_ingredient_strengths.json`

Images are served from:

- `public/images/pharmacy_fixed`

Raw JSON is not read directly by UI or product code. The category module exposes camelCase pharmacy projections through `categoryService`.

## Module Location

Core pharmacy storefront logic lives in:

- `src/features/pharmacy-profile-catalog`

The module is responsible for:

- Mapping fixed pharmacy active ingredients to `ProductRecord`
- Creating stable fixed product IDs
- Applying seller-specific overrides
- Preserving local fixed images unless a seller uploads a replacement
- Hiding fixed products per seller without deleting the source catalog

## Fixed Product IDs

Fixed products are exposed as normal product records using encoded IDs:

```text
pharmacy-fixed-{base64url(uid)}-{fixedProductOriginalId}
```

This lets `/product?mode=view&productId=...` resolve a fixed product together with the seller-specific overrides.

## Data Model

Seller-specific customizations are stored in the product database:

- `pharmacy_profile_category_overrides`
- `pharmacy_profile_subcategory_overrides`
- `pharmacy_profile_product_overrides`

Override status values:

- `visible`
- `hidden`
- `custom`

Fixed source data is never modified. Overrides are scoped by `uid`.

## Image Rules

If a seller edits a fixed pharmacy product and does not replace the image, the module keeps using the local fixed image from `public/images/pharmacy_fixed`.

Only uploaded replacement images are stored in override rows through `image_url` and `image_key`.

## Product Listing

When `productService.listByOwnerAndCategory(uid, "20", "204")` is called:

1. The module builds fixed pharmacy products from the public catalog.
2. Product overrides for the seller are applied.
3. Hidden fixed products are removed from the result.
4. Custom pharmacy products are appended.
5. The result is returned as regular `ProductRecord[]`.

This keeps `/profile?mode=edit` and `/profile?mode=preview` compatible with the existing profile product tabs.

## Profile UI

Inside the regular profile product tabs, the Pharmacies subcategory gets an additional nested pharmacy tab system:

1. Pharmacy main category tab
2. Pharmacy subcategory tab
3. Product grid

The nested tabs are derived from product fields:

- `pharmacyCatalog.categoryId`
- `pharmacyCatalog.categoryNameAr`
- `pharmacyCatalog.subcategoryId`
- `pharmacyCatalog.subcategoryNameAr`

## Ordering

Fixed pharmacy products can be added to the cart immediately.

When no numeric price is available:

- `price.current` remains empty.
- `price.label` is set to `السعر التجاري`.
- The cart displays `السعر التجاري` instead of a zero price.
- The order item still passes through the normal marketplace order flow.

## Editing Fixed Products

Editing a fixed pharmacy product creates or updates a seller-specific override row.

Editable fields include:

- Arabic name
- English name
- Description
- Image
- Form
- Strength
- Prescription requirement
- Price text or numeric price

Deleting a fixed product does not remove the source catalog item. It creates a `hidden` override for that seller.

## Database Compatibility

The schema source is the local product SQLite database. The same schema is synced to Turso through the existing schema sync pipeline.

The migration file is:

- `src/core/database/product/migrations/0002_pharmacy_profile_catalog.sql`

## Future Work

Recommended next steps:

- Add explicit management screens for adding custom pharmacy categories and subcategories.
- Add a restore button for hidden fixed products.
- Add bulk availability controls.
- Add pharmacy-specific filtering by prescription, form, and strength.
- Add stock quantity support when inventory management becomes available.
