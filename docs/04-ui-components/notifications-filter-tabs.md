# Notifications Filter Tabs

## Purpose

This document defines the interaction contract for the notifications page filter strip. It applies the same tab treatment as the profile edit workspace, documented in [`profile-edit-navigation.md`](profile-edit-navigation.md).

## Ownership

The selected filter, its restoration, its persistence, and the strip alignment are owned by:

```text
src/features/notifications/presentation/hooks/use-notifications-filter.ts
```

`NotificationsPageContent` renders the strip and the filtered list from that state and must not hold a second copy of the selected filter.

Absolute programmatic selection inside any horizontally snapping strip is owned by:

```text
src/shared/ui/snap-strip-scroll.ts
```

## Invariants

- The selected filter is the single source of truth for the tab wave animation, the list contents, the accessibility state, and the header summary.
- Selecting a tab must center that tab in the strip. Programmatic centering suspends CSS scroll snapping and smooth scrolling for the duration of the scroll, so a selection is absolute instead of stepping through intermediate tabs.
- The selected tab carries the wave animation, so it must never remain scrolled out of view after a restore or a selection near a strip edge.
- The strip scroll position is derived from the selected filter. It is therefore excluded from generic element-scroll restoration, and the strip must not carry `data-snapshot-scroll`.

## Restoration

Restoration precedence is:

1. An explicit `?filter=` query parameter.
2. The stored per-user filter.
3. `all`.

The notifications feature may not depend on the page-snapshot feature, and the page-snapshot key embeds the full query string anyway, so reaching `/notifications` without `?filter=` would resolve to a different snapshot. A user-keyed record in `ASOL_DB_STORES.APP_SETTINGS`, owned by:

```text
src/features/notifications/application/notifications-filter-storage.ts
```

therefore persists the selected filter independently of the URL. Values are stored raw and normalized by the caller through `filterFromQuery`, so an unknown or stale value degrades to `all`.

The stored filter is read once per page entry and is never applied after the user has already selected a tab, so it cannot fight a live gesture. Restoration updates state only; the URL is rewritten solely by an explicit user selection.

## Regression Coverage

`src/features/notifications/tests/notifications-filter-tabs.test.ts` guards the restoration precedence, the key-stable persistence layer, the shared absolute-selection helper, the strip alignment refs, and the absence of duplicated filter state in the page component.
