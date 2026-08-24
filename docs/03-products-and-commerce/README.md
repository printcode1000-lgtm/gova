# Products and Commerce Domain

## Purpose

Business and presentation documentation for catalog/category behavior, product creation/display/search, seller surfaces, discounts, cart/delivery planning, and marketplace orders.

## Read First

- `categories-and-products/` — catalog/category and product authoring behavior.
- `marketplace-order-management/` — order lifecycle and management flows.
- [Product Card System](./product-card-system.md) — shared product-card behavior.
- [Product Search System](./product-search-system.md) — search behavior and data flow.
- [Seller Card System](./seller-card-system.md) and [Seller Discounts System](./seller-discounts-system.md).

## Architecture Boundaries

Domain meaning belongs in the owning `@asol/*-core` capability. Application orchestration belongs under `src/features/*`; persistence remains behind `@asol/data-core`; page-authored persistence follows the page-save gateway where applicable. UI must not shortcut into repositories or vendor infrastructure.

Check `docs/01-architecture/08-reference/capability-map.md` and the task context pack before introducing a new responsibility.

## Change Impact

Commerce changes frequently cross catalog validation, product data shape, storage/images, search, seller pricing, cart/delivery, marketplace-order persistence, service mirrors, and UI. Use an exact context pack to expose those direct relationships rather than assuming a single-feature change.
