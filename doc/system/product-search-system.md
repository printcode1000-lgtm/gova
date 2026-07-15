# Product Search System

## Purpose

The Product Search System centralizes product and seller search for ASOL. UI components do not query product tables directly. They use the search module, which owns searchable fields, filters, sorting, and API contracts.

## Main Rule

Search fields are category-scoped. A user must select both:

- Main category
- Subcategory

Only then does the UI show the columns that can be searched for that category pair.

## Architecture

- `src/features/product-search`
  - Search types.
  - Category-aware searchable field definitions.
  - Enabled field resolution from product style settings.
  - Product search API service.
  - Server search service.
  - Product search repository.

- `src/components/ui/product-search`
  - Shared UI components for compact and full search experiences.

- `src/app/api/search/products`
  - Product search endpoint.

- `src/app/api/search/sellers`
  - Seller/provider search endpoint.

- `src/app/api/search/fields`
  - Returns enabled searchable columns for the selected category/subcategory.

- `src/app/search`
  - Full search page opened from the top header search button.

## Search Contexts

### Profile Product Search

Profile product tabs use the compact search form.

The search scope is restricted by:

- `ownerUid`
- `mainCategoryId`
- `subcategoryId`

This means a profile page never returns products from another seller.

### Global Search

The `/search` page supports:

- Product search.
- Seller/provider search.

The user selects a main category and subcategory before selecting fields or running a meaningful search.

## Product Search Fields

Searchable field definitions are configured in:

`src/features/product-search/config/product-search-fields.ts`

Field availability per category is controlled by product style settings saved from:

`/dev/category-selector`

Inside "component settings", the developer can enable or disable each searchable column per component. A field is available only when:

- The main category and subcategory are selected.
- The owning product component is visible.
- The search column checkbox is enabled for that component.

The search columns container itself has no display order. Component order belongs only to product page rendering.

To add a new searchable field, add it to the config with:

- `key`
- database `column`
- Arabic label
- English label
- group
- component key
- option key

## Sorting

Product sorting supports:

- Default
- Newest
- Oldest
- Name
- Lowest price
- Highest price

Lowest/highest price are sort options, not input fields. Products without a numeric price are placed last when sorting by price.

Seller sorting supports:

- Relevance
- Name

Seller filters support minimum profile rating from a dropdown:

- 4 and up
- 3 and up
- 2 and up
- 1 and up

Seller rating uses the same profile reviews average used by the profile page.

## Filters

Current product filters:

- Available only
- Needs car
- Status, only where drafts are allowed
- Minimum rating from a dropdown: 4 and up, 3 and up, 2 and up, 1 and up

The system is prepared for category-specific filters, but fields remain hidden until category and subcategory are selected.

## Arabic Search

The system normalizes Arabic search input and selected text columns by:

- Removing diacritics from the query.
- Normalizing `أ`, `إ`, and `آ` to `ا`.
- Normalizing spaces.
- Lower-casing text.

## API

### Product Search

`GET /api/search/products`

Query parameters:

- `q`
- `ownerUid`
- `mainCategoryId`
- `subcategoryId`
- `fields`
- `sort`
- `offset`
- `limit`
- `includeDrafts`
- `availableOnly`
- `needsCar`
- `status`
- `minRating`

Price ordering is handled by `sort=price_asc` or `sort=price_desc`; there are no min/max price input fields in the current UI.

### Search Fields

`GET /api/search/fields`

Query parameters:

- `mainCategoryId`
- `subcategoryId`

Returns only the columns enabled for the selected category/subcategory.

### Seller Search

`GET /api/search/sellers`

Query parameters:

- `q`
- `mainCategoryId`
- `subcategoryId`
- `sort`
- `offset`
- `limit`
- `minRating`

Seller search uses the existing profile specialties data and returns providers linked to the selected category/subcategory.

## UI Components

### `ProductSearchPanel`

Shared search panel.

Variants:

- `compact`: used inside profile product tabs.
- `full`: used in `/search`.

### `ProductSearchFieldSelector`

Displays category-specific searchable columns. If no category/subcategory pair is selected, it shows a message instead of fields.

### `ProductSearchColumnsStyleEditor`

Used in `/dev/category-selector` to enable or disable product search columns per component.

## Header Integration

The top header search button:

`id="header-search-button"`

opens:

`/search`

## Security

Global product search returns active products only by default.

Profile edit search can include drafts when explicitly enabled by the caller.

Archived products are not returned unless future admin-only tooling explicitly adds that capability.

The server enforces enabled search fields. If a client sends a disabled field manually, it is ignored.

## Future Extensions

Planned-compatible additions:

- Saved searches in AsolDB.
- Search result explanations.
- More category-specific filters.
- Search analytics.
- Location-aware seller ordering.
- Server-side pagination UI.
