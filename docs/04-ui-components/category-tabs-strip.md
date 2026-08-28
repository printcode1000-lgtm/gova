# Category Tabs Strip

## Purpose

`src/shared/ui/category-tabs-strip.tsx` is the single presentational strip for
horizontal catalog tab rows: an image, a label, and an optional count per tab,
laid out in a snap-scrolling horizontal row.

It is presentation only. It owns no data source, no catalog rule, and no
selection rule; every caller passes its own items, its own selected id, and its
own `onSelect` handler.

## Levels

| Level | Used for | Height | Selected colors |
| --- | --- | --- | --- |
| `main` | main categories | `h-12` | `primary` / `on-primary` |
| `sub` | subcategories | `h-10` | `tertiary` / `on-tertiary` |

## Snapshot scrolling

Passing `snapshotId` marks the strip with `data-snapshot-scroll` and
`data-snapshot-id`, so the page-snapshot system restores its horizontal scroll
offset. Callers that do not need restoration omit it.

## Diagnostic identity

The strip declares no uid of its own — a generic helper under `src/shared/ui/`
never does. A caller that needs its tabs addressable passes a repeated
`UiDescriptor` through `itemUi`, which the strip spreads onto every tab button.

## Consumers

- `src/features/profile-products/presentation/ProfileProductsTabs.tsx` — the
  profile's specialty tabs, limited to the owner's selected specialties.
- `src/features/product-search/presentation/panel/ProductSearchPanel.tsx` — the
  `/search` category pickers, covering the whole catalog. See
  [Product Search System](../03-products-and-commerce/product-search-system.md).

## Interaction rules

Tabs are `<button>` elements driven by tap and `active:`/`focus-visible:`
styling, with `aria-pressed` marking the selected tab. No hover behavior, no
pointer cursor, no DOM `title`, and every label stays selectable, per the
[Touch Interaction Policy](./touch-interaction-policy.md).
