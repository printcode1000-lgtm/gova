# Product Page and Category Database Contract

## Current Storage

The products table maintains the two legacy text columns:

- `main_category_id`
- `subcategory_id`

The values are backward compatible with Product Style filenames. Before creating a product, `ProductService` converts the values to numbers and passes them to `categoryService.resolveLegacyProductSelection`.

## Validity Rules

- Subcategory must belong to the main category.
- Collection member must belong to the collection.
- Unknown ID or wrong relationship is rejected with `invalidCategorySelection`.
- The default Doctor Appointment does not represent a valid product choice. Delivery Services has a valid subcategory for Product Style customization.
- Regex protects input format only; Resolver is the source of relationship validity.

## Product Style

The developer API path applies the same validation on GET and PUT. Style files are not read or written for invalid category relationships. The filename format `<mainId>__<subcategoryId>.json` continues to preserve existing files.

If the custom file does not exist, the create, view, and edit pages use `public/product/style/default.json`. The default design displays images, rating, price, order, main data, and general specifications, and hides pharmacy, vehicle, and real estate components.

## Display in Profile

The products tab requests owner products by `mainCategoryId` and `subcategoryId` from the active products database: SQLite in development and Turso in production. The container displays the first saved image and `mainData.name`, and links the item to the product view page. After creating a product from the profile, the page returns to `/profile?mode=edit&tab=products`.

## Source of Category Names

The products database does not duplicate category titles or images. All display data comes from the categories module, which alone reads the official JSON.

## User Specialties

The user_specialties table stores user specialty selections as boolean columns. Each specialty (subcategory, collection member, or medical specialty) has a corresponding column in the format `{slug(titleEn)}_{originalId}`.

The table is separate from the products table and is used for:
- Filtering users by specialty in seller pages
- Displaying users who offer specific products or services
- Supporting hierarchical relationships (collection members include all subcategories)

The products table and user_specialties table are independent but both reference the same category data structure through the categories module.
