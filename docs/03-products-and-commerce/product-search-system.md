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

- `src/features/product-search/presentation/panel`
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

Search results resolve every stored product image key through
`image.storageProfileId` when present, otherwise `product-default`, before
returning cards. Apparel/pets uploads that stored `product-apparel-pets` resolve
against the dedicated bucket; legacy rows without the field stay on the original
product account. The compact search therefore preserves the same image URLs as
the normal owner/category listing.
In profile edit mode, **Featured only** is a management view across all selected
specialties rather than a filter limited to the currently active subcategory.

### Global Search

The `/search` page supports:

- Product search.
- Seller/provider search.

The page keeps its original search `h1` and search icon. The full search panel presents three linked collapsible sections: **Choose category** (`اختر التصنيف`), **Choose search scope** (`اختر مجال البحث`), and **Order search results** (`ترتيب نتائج البحث`). The three accordion containers use distinct theme-aware accents and backgrounds: primary for Choose category, secondary for Choose search scope, and tertiary for Order search results. All three are collapsed by default. Opening one automatically collapses the previously open section, while tapping the open section again closes it, so zero or one section can be expanded at a time. Each header keeps its existing icon and shared `title-line-contact` gradient rule, exposes `aria-expanded` and `aria-controls`, and shows a rotating chevron for the open state. The accordion and its internal groups keep fixed `6px` spacing on every viewport size.

The category section contains the main/sub category strips. The search-scope section contains the Services/Service providers controls and, in Services mode, the bordered `Search in` (`سوف يتم البحث في`) selector. The Order search results section contains only the dynamic sort/rating controls. The search input and Search button are rendered outside the accordion, immediately below the three collapsible sections, so they remain visible regardless of which section is open. Each dropdown row keeps two fixed columns on every viewport: the localized label in the first column and its select element in the second, with a `6px` gap and no responsive stacking override.

The user selects a main category and subcategory before selecting fields or running a meaningful search.

Both pickers are horizontal tab strips, not dropdowns. They render through the
shared `CategoryTabsStrip` (`src/shared/ui/category-tabs-strip.tsx`), the same
presentational strip the profile products tabs and specialty-request category
selectors use, so a tab carries the category image next to its name and the strip
snap-scrolls horizontally. The paired main/sub strips use the shared
`CATEGORY_TABS_PAIR_CLASS`, which fixes their vertical separation at exactly
`6px` on every viewport size with no responsive override. The shared strip also
uses exactly `6px` between neighboring main-category tabs and between neighboring
subcategory tabs, with only `6px` of horizontal padding inside either tab level.
These spacing values have no responsive override.

The strips are fed by `buildProductSearchCategoryTabs`
(`src/features/product-search/presentation/panel/product-search-category-tabs.ts`),
which returns the **whole catalog**: every searchable main category with its
searchable subcategories, filtered by no profile selection. Collections are
expanded into their member categories, because a product is stored under a
member category and one of its real subcategories, never under the collection
itself. Selecting a main tab clears the subcategory and the selected field keys.

In the panel's `compact` variant (the profile products search box) the category
pair is fixed by `fixedMainCategoryId`/`fixedSubcategoryId`, so no strip is
rendered there.

## Product Search Fields

Searchable field definitions are configured in:

`src/features/product-search/application/config/product-search-fields.ts`

Field availability per category is controlled by product style settings saved from
`/dev/category-selector`. Runtime resolution of enabled columns uses
`@asol/product-style-core/server` (`readNormalizedStyleComponents`,
`filterSearchFieldsByStyle`).

`submain` mirrors `public/product/style/` as runtime assets because category-pair files are resolved dynamically and are invisible to import-graph walking. `product-style-core` reads the canonical path in the main application and falls back to `generated/public/product/style/` inside the service mirror, so profile search and `/search` use the same settings saved by `/dev/category-selector`.

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

Lowest/highest price are sort options, not input fields. Products without a numeric price are placed last when sorting by price. The full product-search controls show visible labels above the sort selector (`Sort results` / `ترتيب النتائج`) and the optional rating selector (`Minimum rating` / `الحد الأدنى للتقييم`).

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
- Normalizing Arabic alef variants (alef with hamza above/below and alef madda) to standard alef.
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

The shared `ProductSearchPanel` keeps UI orchestration. Its props contract is in
`src/features/product-search/presentation/panel/product-search-panel.types.ts`, and default
field selection lives in `src/features/product-search/presentation/panel/product-search-fields.ts`.

Profile product tab selection uses
`src/features/profile-products/presentation/hooks/profile-products-tabs-model.ts` for
non-React normalization, bucket keys, filtering, and product sorting; the hook
keeps React state and loading.

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
