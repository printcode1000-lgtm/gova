# Developer Category Selector

The developer selector is a consumer of the public API in `@/features/categories`.

## Flow

1. Gets main options from the module.
2. Gets child options according to parent type: category or collection.
3. Displays details from the camelCase Typed model.
4. Before reading or saving Product Style, the server verifies the relationship via `resolveLegacyProductSelection`.
5. The old filename format `<mainId>__<childId>.json` remains for compatibility, but the IDs must represent a valid relationship.

`doctor-appointment` is a virtual display option and not a final Product Style; a real medical specialty must be selected to create a product. Delivery Services does not appear in product options.

Using `category_id`, `original_id`, or `sub_collection` or reading JSON files inside the tool is prohibited.
