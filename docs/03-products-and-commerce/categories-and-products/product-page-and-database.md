# Product Page and Category Database Contract

## Current Product Model

Products are stored as explicit database columns. The product system does not use `data_json`, `product.data.fields`, or a generic field bag.

The runtime product object is grouped by purpose:

- `mainData`
- `price`
- `specifications`
- `vehicleSpecs`
- `propertySpecs`
- `pharmacyCatalog`
- `pharmacySpecs`
- `rating`
- `images`

Images are the only product value stored as a variable list, currently through `images_json`.

See [Product Data Model](../system/product-data-model.md) for the full data model and storage rules.

## Category Columns

The products table keeps the category selection in two text columns:

- `main_category_id`
- `subcategory_id`

These values remain compatible with Product Style filenames. Before creating a product, `ProductService` validates them through `categoryService.resolveLegacyProductSelection`.

## Validity Rules

- Subcategory must belong to the main category.
- Collection member must belong to the collection.
- Unknown ID or wrong relationship is rejected with `invalidCategorySelection`.
- The default Doctor Appointment does not represent a valid product choice.
- Delivery Services has a valid subcategory for Product Style customization.
- Regex protects input format only; the category resolver is the source of relationship validity.

## Product Style

The developer API path applies the same validation on GET and PUT. Style files are not read or written for invalid category relationships. The filename format `<mainId>__<subcategoryId>.json` continues to preserve existing files.

If the custom file does not exist, the create, view, and edit pages use `public/product/style/default.json`. The default design displays images, rating, price, order, main data, and general specifications, and hides pharmacy, vehicle, and real estate components.

Product Style controls which components appear. It does not define database storage. Component values are saved into the typed product sections and database columns.

## Product Page Flow

`/product` supports:

- `mode=new`
- `mode=edit`
- `mode=view`

Create and edit use the same typed `ProductDetails` shape. Saving calls `/api/products` with the grouped product sections, not a `data` payload.

The server persists the values through `ProductRepository`, which writes the explicit `products` columns.

## Display in Profile

The products tab requests owner products by `mainCategoryId` and `subcategoryId` from the active products database:

- SQLite in development
- Turso in production

The product card displays:

- First image from `product.images`
- Product title from `product.mainData.name`
- Price from `product.price.current` or `product.price.label`

After creating a product from the profile, the page returns to `/profile?mode=edit&tab=products`.

## Source of Category Names

The products database does not duplicate category titles or category images. All category display data comes from the categories module, which alone reads the official category JSON.

## User Specialties

The `user_specialties` table stores user specialty selections as boolean columns. Each specialty has a corresponding column in the format `{slug(titleEn)}_{originalId}`.

The table is separate from the products table and is used for:

- Filtering users by specialty in seller pages
- Displaying users who offer specific products or services
- Supporting hierarchical relationships

The products table and `user_specialties` table are independent but both reference the same category data through the categories module.
